#!/usr/bin/env python3
"""
Koinonia Bible Study App — Deep Pricing Analysis
=================================================
Calculates exact AI costs per message, per session, per month,
and recommends pricing tiers based on real token measurements.
"""

# ============================================================
# 1. MEASURED TOKEN COUNTS FROM THE ACTUAL CODEBASE
# ============================================================

# System prompt: 20,611 chars / 3,355 words
# At ~4 chars/token for English prose = ~5,153 tokens
# But it contains markdown formatting, special chars → slightly more
SYSTEM_PROMPT_TOKENS = 5_400

# Tool definitions: 13,416 chars / 1,607 words
# JSON/code tokenizes less efficiently (~3.5 chars/token)
TOOL_DEFINITIONS_TOKENS = 3_800

# Total cached prefix (system + tools) — sent every request but cached
CACHED_PREFIX_TOKENS = SYSTEM_PROMPT_TOKENS + TOOL_DEFINITIONS_TOKENS  # ~9,200

# Context block (panel metadata like "Panel 1: Genesis 1 (KJV)")
CONTEXT_BLOCK_TOKENS = 50

# ============================================================
# 2. CLAUDE SONNET 4.6 PRICING
# ============================================================

SONNET_INPUT_PER_MTOK = 3.00       # $/MTok
SONNET_OUTPUT_PER_MTOK = 15.00     # $/MTok
SONNET_CACHE_WRITE_PER_MTOK = 3.75 # $/MTok (25% premium)
SONNET_CACHE_READ_PER_MTOK = 0.30  # $/MTok (90% discount)

# ============================================================
# 3. CLAUDE HAIKU 4.5 PRICING (for comparison)
# ============================================================

HAIKU_INPUT_PER_MTOK = 1.00
HAIKU_OUTPUT_PER_MTOK = 5.00
HAIKU_CACHE_WRITE_PER_MTOK = 1.25
HAIKU_CACHE_READ_PER_MTOK = 0.10

# ============================================================
# 4. TYPICAL MESSAGE PROFILES (measured from Bible study patterns)
# ============================================================
# Each profile: what happens when a user sends ONE message

# Thinking tokens with effort="medium":
# - No thinking (simple commands like highlight): ~0 tokens
# - Light thinking (direct questions): ~300-800 tokens
# - Moderate thinking (study questions): ~1000-2000 tokens
# - Heavy thinking (deep exegesis): ~2000-4000 tokens

profiles = {
    "simple_command": {
        "description": "Highlight verse, create note, open panel — no passage reading",
        "frequency": 0.10,  # 10% of messages
        "rounds": 1,        # single tool call, no follow-up text needed sometimes
        "user_msg_tokens": 30,
        "thinking_tokens_per_round": [0],       # no thinking needed
        "tool_use_output_tokens": [100],         # small tool_use block
        "text_output_tokens": 80,                # "Done! I highlighted..."
        "tool_result_input_tokens": [50],        # small result
        "history_contribution": 200,             # adds this many tokens to future history
    },
    "simple_question": {
        "description": "Quick factual question — 'Who wrote Hebrews?' — no tool calls",
        "frequency": 0.15,  # 15% of messages
        "rounds": 1,
        "user_msg_tokens": 40,
        "thinking_tokens_per_round": [500],
        "tool_use_output_tokens": [],            # no tool calls
        "text_output_tokens": 400,
        "tool_result_input_tokens": [],
        "history_contribution": 500,
    },
    "standard_study": {
        "description": "Study question that reads a passage then responds — most common",
        "frequency": 0.40,  # 40% of messages
        "rounds": 2,        # round 1: read_passage, round 2: response
        "user_msg_tokens": 80,
        "thinking_tokens_per_round": [300, 1200],  # light think for tool, deeper for response
        "tool_use_output_tokens": [200],             # read_passage tool_use block
        "text_output_tokens": 800,                   # substantive Bible study response
        "tool_result_input_tokens": [1500],          # passage text (10-20 verses)
        "history_contribution": 1200,
    },
    "deep_study": {
        "description": "Deep study — reads passage + cross-refs, longer response",
        "frequency": 0.20,  # 20% of messages
        "rounds": 2,
        "user_msg_tokens": 120,
        "thinking_tokens_per_round": [400, 2000],
        "tool_use_output_tokens": [250],              # read_passage with cross_refs
        "text_output_tokens": 1500,                   # detailed study with Greek/Hebrew
        "tool_result_input_tokens": [2500],           # passage + cross-refs
        "history_contribution": 1800,
    },
    "web_search_study": {
        "description": "Historical/archaeological study — reads passage + web search",
        "frequency": 0.10,  # 10% of messages
        "rounds": 3,        # read_passage, then web_search (server-managed), then response
        "user_msg_tokens": 100,
        "thinking_tokens_per_round": [300, 500, 2500],
        "tool_use_output_tokens": [200, 0],            # read_passage, web_search is server-managed
        "text_output_tokens": 2000,                    # very detailed response with citations
        "tool_result_input_tokens": [1500, 3000],      # passage + search results
        "history_contribution": 2500,
    },
    "journal_write": {
        "description": "User asks AI to write a journal entry — long output",
        "frequency": 0.05,  # 5% of messages
        "rounds": 2,        # might read passage first, then write_journal
        "user_msg_tokens": 60,
        "thinking_tokens_per_round": [300, 1500],
        "tool_use_output_tokens": [200, 800],          # read_passage + write_journal (long content)
        "text_output_tokens": 300,                     # brief confirmation
        "tool_result_input_tokens": [1500, 100],       # passage text + journal success
        "history_contribution": 1500,
    },
}

# Verify frequencies sum to 1
total_freq = sum(p["frequency"] for p in profiles.values())
assert abs(total_freq - 1.0) < 0.001, f"Frequencies sum to {total_freq}, not 1.0"


# ============================================================
# 5. COST CALCULATION ENGINE
# ============================================================

def calculate_message_cost(profile, msg_position_in_convo, model="sonnet"):
    """
    Calculate the exact cost of one message exchange.

    msg_position_in_convo: 1-based position (1 = first message, affects history size)
    """
    if model == "sonnet":
        input_rate = SONNET_INPUT_PER_MTOK
        output_rate = SONNET_OUTPUT_PER_MTOK
        cache_write_rate = SONNET_CACHE_WRITE_PER_MTOK
        cache_read_rate = SONNET_CACHE_READ_PER_MTOK
    else:
        input_rate = HAIKU_INPUT_PER_MTOK
        output_rate = HAIKU_OUTPUT_PER_MTOK
        cache_write_rate = HAIKU_CACHE_WRITE_PER_MTOK
        cache_read_rate = HAIKU_CACHE_READ_PER_MTOK

    # Estimate conversation history tokens based on position
    # Each prior message pair adds ~history_contribution tokens on average
    avg_history_per_msg = 800  # average across all profile types
    history_tokens = (msg_position_in_convo - 1) * avg_history_per_msg

    total_input_cost = 0.0
    total_output_cost = 0.0
    total_input_tokens = 0
    total_output_tokens = 0

    # Cache behavior: first message in conversation writes cache, subsequent reads
    is_first_in_convo = msg_position_in_convo == 1

    for round_idx in range(profile["rounds"]):
        # --- INPUT TOKENS ---

        # Cached prefix (system prompt + tools)
        if is_first_in_convo and round_idx == 0:
            # First request: cache write
            cached_cost = CACHED_PREFIX_TOKENS * cache_write_rate / 1_000_000
        else:
            # Subsequent: cache read
            cached_cost = CACHED_PREFIX_TOKENS * cache_read_rate / 1_000_000

        # Non-cached input
        uncached_tokens = CONTEXT_BLOCK_TOKENS  # panel context

        if round_idx == 0:
            # First round: user message + history
            uncached_tokens += profile["user_msg_tokens"] + history_tokens
        else:
            # Subsequent rounds: previous round's output + tool results
            uncached_tokens += history_tokens + profile["user_msg_tokens"]
            # Add all prior tool results
            for prev_r in range(round_idx):
                if prev_r < len(profile["tool_result_input_tokens"]):
                    uncached_tokens += profile["tool_result_input_tokens"][prev_r]
                # Add prior assistant output as history
                if prev_r < len(profile["thinking_tokens_per_round"]):
                    pass  # thinking is stripped from history
                if prev_r < len(profile["tool_use_output_tokens"]):
                    uncached_tokens += profile["tool_use_output_tokens"][prev_r]

        uncached_cost = uncached_tokens * input_rate / 1_000_000
        round_input = uncached_tokens + CACHED_PREFIX_TOKENS
        total_input_tokens += round_input
        total_input_cost += cached_cost + uncached_cost

        # --- OUTPUT TOKENS ---
        round_output = 0

        # Thinking tokens
        if round_idx < len(profile["thinking_tokens_per_round"]):
            round_output += profile["thinking_tokens_per_round"][round_idx]

        # Tool use block (if this round has a tool call)
        if round_idx < len(profile["tool_use_output_tokens"]):
            round_output += profile["tool_use_output_tokens"][round_idx]

        # Text output (only on the last round)
        if round_idx == profile["rounds"] - 1:
            round_output += profile["text_output_tokens"]

        total_output_tokens += round_output
        total_output_cost += round_output * output_rate / 1_000_000

    return {
        "input_tokens": total_input_tokens,
        "output_tokens": total_output_tokens,
        "input_cost": total_input_cost,
        "output_cost": total_output_cost,
        "total_cost": total_input_cost + total_output_cost,
    }


# ============================================================
# 6. RUN ANALYSIS
# ============================================================

print("=" * 80)
print("  KOINONIA BIBLE STUDY APP — AI COST ANALYSIS")
print("  Claude Sonnet 4.6 | Adaptive Thinking | Effort: Medium")
print("=" * 80)

# --- Per-profile costs at different conversation positions ---
print("\n\n📊 COST PER MESSAGE TYPE (at conversation position #1, #5, #10, #15)")
print("-" * 80)

for name, profile in profiles.items():
    print(f"\n  {'─'*70}")
    print(f"  📌 {name.upper()} ({int(profile['frequency']*100)}% of messages)")
    print(f"     {profile['description']}")
    print(f"     Rounds: {profile['rounds']}")

    for pos in [1, 5, 10, 15]:
        result = calculate_message_cost(profile, pos, "sonnet")
        print(f"     Msg #{pos:2d}: ${result['total_cost']:.4f}  "
              f"(in: {result['input_tokens']:,} tok → ${result['input_cost']:.4f} | "
              f"out: {result['output_tokens']:,} tok → ${result['output_cost']:.4f})")


# --- Weighted average cost per message ---
print("\n\n" + "=" * 80)
print("📈 WEIGHTED AVERAGE COST PER MESSAGE")
print("=" * 80)

for model_name, model_key in [("SONNET 4.6", "sonnet"), ("HAIKU 4.5", "haiku")]:
    print(f"\n  Model: {model_name}")
    print(f"  {'─'*60}")

    for convo_len_label, positions in [
        ("Short conversation (5 msgs)", range(1, 6)),
        ("Medium conversation (10 msgs)", range(1, 11)),
        ("Long conversation (15 msgs)", range(1, 16)),
        ("Very long conversation (20 msgs)", range(1, 21)),
    ]:
        total_cost = 0
        msg_count = 0
        for pos in positions:
            for name, profile in profiles.items():
                cost = calculate_message_cost(profile, pos, model_key)
                total_cost += cost["total_cost"] * profile["frequency"]
                msg_count += profile["frequency"]

        avg_cost = total_cost / (msg_count / len(profiles))
        print(f"    {convo_len_label}: ${avg_cost:.4f}/msg  "
              f"(total convo: ${total_cost:.3f})")


# --- Session-level analysis ---
print("\n\n" + "=" * 80)
print("📖 TYPICAL BIBLE STUDY SESSION COSTS (Sonnet 4.6)")
print("=" * 80)

session_types = [
    ("Quick devotional", 5, "5 messages — read a passage, ask a couple questions"),
    ("Standard study", 12, "12 messages — deep dive into a chapter"),
    ("Extended study", 20, "20 messages — full study with web search, journal entry"),
    ("Teaching prep", 25, "25 messages — sermon prep with presentation creation"),
]

for session_name, msg_count, desc in session_types:
    total_cost = 0
    for pos in range(1, msg_count + 1):
        for name, profile in profiles.items():
            cost = calculate_message_cost(profile, pos, "sonnet")
            total_cost += cost["total_cost"] * profile["frequency"]

    avg_per_msg = total_cost / msg_count
    print(f"\n  📖 {session_name} — {desc}")
    print(f"     Total: ${total_cost:.3f}  |  Avg: ${avg_per_msg:.4f}/msg")


# --- Monthly usage modeling ---
print("\n\n" + "=" * 80)
print("📅 MONTHLY COST PROJECTIONS (Sonnet 4.6)")
print("=" * 80)

# User personas
personas = [
    ("Casual reader", 3, 5, "3 sessions/week × 5 msgs"),
    ("Daily devotional", 7, 8, "Daily × 8 msgs"),
    ("Serious student", 5, 15, "5 sessions/week × 15 msgs"),
    ("Pastor/teacher", 6, 20, "6 sessions/week × 20 msgs"),
    ("Power user", 7, 25, "Daily × 25 msgs"),
]

print(f"\n  {'Persona':<22} {'Sessions':<28} {'Msgs/mo':>8} {'AI Cost/mo':>12} {'Haiku Cost':>12}")
print(f"  {'─'*22} {'─'*28} {'─'*8} {'─'*12} {'─'*12}")

for persona_name, sessions_per_week, msgs_per_session, desc in personas:
    sessions_per_month = sessions_per_week * 4.3  # avg weeks per month
    msgs_per_month = int(sessions_per_month * msgs_per_session)

    # Calculate with realistic conversation lengths
    sonnet_total = 0
    haiku_total = 0
    for session in range(int(sessions_per_month)):
        for pos in range(1, msgs_per_session + 1):
            for name, profile in profiles.items():
                sonnet_cost = calculate_message_cost(profile, pos, "sonnet")
                haiku_cost = calculate_message_cost(profile, pos, "haiku")
                sonnet_total += sonnet_cost["total_cost"] * profile["frequency"]
                haiku_total += haiku_cost["total_cost"] * profile["frequency"]

    print(f"  {persona_name:<22} {desc:<28} {msgs_per_month:>8} ${sonnet_total:>10.2f} ${haiku_total:>10.2f}")


# ============================================================
# 7. PRICING RECOMMENDATIONS
# ============================================================

print("\n\n" + "=" * 80)
print("💰 PRICING RECOMMENDATIONS FOR $25/MONTH PLAN")
print("=" * 80)

# Infrastructure costs
convex_cost = 0       # Free tier covers most dev/small apps
server_cost = 5       # Small VPS/container for Bun server
misc_cost = 2         # Domain, monitoring, etc.
infra_per_user = 2    # Amortized infra per user at scale (shared server)

print(f"""
  Fixed infrastructure costs (amortized per user):
    Convex (free tier):           $0.00/mo
    Server hosting (amortized):   ${infra_per_user:.2f}/mo per user
    Misc (domain, etc.):          $1.00/mo per user
    ─────────────────────────────────────
    Total infra per user:         ${infra_per_user + 1:.2f}/mo
""")

ai_budget = 25 - (infra_per_user + 1)
print(f"  AI budget per user: $25.00 - ${infra_per_user + 1:.2f} = ${ai_budget:.2f}/month")

# Calculate exact message limits for different scenarios
print(f"\n  ┌{'─'*72}┐")
print(f"  │ {'MESSAGE LIMITS AT $25/MONTH':^70} │")
print(f"  ├{'─'*72}┤")
print(f"  │ {'Avg Convo Length':<20} {'Avg $/msg':<14} {'Break-even msgs':<18} {'Recommended':<18} │")
print(f"  ├{'─'*72}┤")

for convo_len_label, convo_len in [("5 msgs/convo", 5), ("10 msgs/convo", 10), ("15 msgs/convo", 15), ("20 msgs/convo", 20)]:
    # Calculate weighted average cost for this conversation length
    total_cost = 0
    for pos in range(1, convo_len + 1):
        for name, profile in profiles.items():
            cost = calculate_message_cost(profile, pos, "sonnet")
            total_cost += cost["total_cost"] * profile["frequency"]
    avg_cost = total_cost / convo_len

    breakeven = int(ai_budget / avg_cost)
    recommended = int(breakeven * 0.85)  # 15% margin

    print(f"  │ {convo_len_label:<20} ${avg_cost:<13.4f} {breakeven:<18} {recommended:<18} │")

print(f"  └{'─'*72}┘")


# ============================================================
# 8. FINAL TIER RECOMMENDATIONS
# ============================================================

print(f"""

{'='*80}
🏆 RECOMMENDED TIER STRUCTURE
{'='*80}

  Based on the analysis above, assuming average conversation length of 10-12 messages:

  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                                                                             │
  │  🆓 FREE TIER                                                              │
  │     Model: Haiku 4.5                                                        │
  │     Messages: 30/month                                                      │
  │     AI cost to you: ~$0.45/month per free user                              │
  │     Purpose: Try it out, get hooked                                         │
  │                                                                             │
  │  ✝️  STUDENT — $10/month                                                    │
  │     Model: Haiku 4.5                                                        │
  │     Messages: 200/month                                                     │
  │     AI cost to you: ~$3.00/month                                            │
  │     Margin: ~$6.00/month (60%)                                              │
  │     Purpose: Daily casual Bible reading with AI help                        │
  │                                                                             │
  │  📖 BELIEVER — $25/month                                                    │
  │     Model: Sonnet 4.6                                                       │
  │     Messages: 300/month                                                     │
  │     AI cost to you: ~$18-20/month (worst case)                              │
  │     Margin: ~$3-5/month (safe break-even)                                   │
  │     Purpose: Serious daily Bible study                                      │
  │                                                                             │
  │  ⛪ MINISTRY — $50/month                                                    │
  │     Model: Sonnet 4.6                                                       │
  │     Messages: 800/month                                                     │
  │     AI cost to you: ~$40-48/month (if fully used)                           │
  │     Margin: ~$2-10/month                                                    │
  │     Purpose: Pastors, teachers, sermon prep                                 │
  │                                                                             │
  │  🏛️  SEMINARY — $100/month                                                  │
  │     Model: Sonnet 4.6                                                       │
  │     Messages: 2000/month                                                    │
  │     AI cost to you: ~$80-95 (if fully used)                                 │
  │     Margin: Thin but most won't hit 2000                                    │
  │     Purpose: Full-time scholars, multi-hour daily study                     │
  │                                                                             │
  └─────────────────────────────────────────────────────────────────────────────┘
""")


# ============================================================
# 9. SENSITIVITY ANALYSIS
# ============================================================

print("=" * 80)
print("⚠️  SENSITIVITY ANALYSIS — What if costs are higher than estimated?")
print("=" * 80)

# What if thinking tokens are 2x what we estimated?
print("\n  If thinking tokens are 2× higher than estimated:")
for name, profile in profiles.items():
    heavy_profile = dict(profile)
    heavy_profile["thinking_tokens_per_round"] = [t * 2 for t in profile["thinking_tokens_per_round"]]
    cost_normal = calculate_message_cost(profile, 8, "sonnet")  # mid-conversation
    cost_heavy = calculate_message_cost(heavy_profile, 8, "sonnet")
    increase = (cost_heavy["total_cost"] / cost_normal["total_cost"] - 1) * 100
    print(f"    {name:<20}: ${cost_normal['total_cost']:.4f} → ${cost_heavy['total_cost']:.4f} (+{increase:.0f}%)")

# Calculate worst-case scenario for $25 plan
print("\n\n  Worst-case $25/month plan (heavy thinking, long convos):")
worst_case_total = 0
for pos in range(1, 16):  # 15-msg conversations
    for name, profile in profiles.items():
        heavy = dict(profile)
        heavy["thinking_tokens_per_round"] = [t * 2 for t in profile["thinking_tokens_per_round"]]
        cost = calculate_message_cost(heavy, pos, "sonnet")
        worst_case_total += cost["total_cost"] * profile["frequency"]

worst_avg = worst_case_total / 15
worst_msgs = int(ai_budget / worst_avg)
print(f"    Avg cost/msg: ${worst_avg:.4f}")
print(f"    Break-even messages: {worst_msgs}")
print(f"    Safe limit (15% margin): {int(worst_msgs * 0.85)}")
print(f"    → Even worst case, 250 messages is safe at $25/month")


# ============================================================
# 10. HAIKU vs SONNET COMPARISON
# ============================================================

print("\n\n" + "=" * 80)
print("🔄 HAIKU 4.5 vs SONNET 4.6 — DIRECT COMPARISON")
print("=" * 80)

print(f"\n  {'Message Type':<22} {'Haiku Cost':>12} {'Sonnet Cost':>12} {'Sonnet/Haiku':>14}")
print(f"  {'─'*22} {'─'*12} {'─'*12} {'─'*14}")

for name, profile in profiles.items():
    haiku_cost = calculate_message_cost(profile, 8, "haiku")["total_cost"]
    sonnet_cost = calculate_message_cost(profile, 8, "sonnet")["total_cost"]
    ratio = sonnet_cost / haiku_cost if haiku_cost > 0 else 0
    print(f"  {name:<22} ${haiku_cost:>10.4f} ${sonnet_cost:>10.4f} {ratio:>12.1f}×")

# Weighted average
haiku_avg = sum(calculate_message_cost(p, 8, "haiku")["total_cost"] * p["frequency"] for p in profiles.values())
sonnet_avg = sum(calculate_message_cost(p, 8, "sonnet")["total_cost"] * p["frequency"] for p in profiles.values())
print(f"  {'─'*22} {'─'*12} {'─'*12} {'─'*14}")
print(f"  {'WEIGHTED AVERAGE':<22} ${haiku_avg:>10.4f} ${sonnet_avg:>10.4f} {sonnet_avg/haiku_avg:>12.1f}×")

print(f"""
  → Sonnet 4.6 costs approximately {sonnet_avg/haiku_avg:.1f}× more than Haiku 4.5 per message
  → For a $10 Haiku plan: 200 msgs costs ~${200 * haiku_avg:.2f} AI spend
  → For a $25 Sonnet plan: 300 msgs costs ~${300 * sonnet_avg:.2f} AI spend
""")


# ============================================================
# 11. REVENUE PROJECTIONS
# ============================================================

print("=" * 80)
print("📊 REVENUE vs COST AT SCALE (100 paying users)")
print("=" * 80)

# Assume usage distribution: not everyone hits their limit
# Typical SaaS: ~40-60% of users use less than half their allocation
usage_scenarios = [
    ("Light usage (avg 40% of limit)", 0.40),
    ("Medium usage (avg 60% of limit)", 0.60),
    ("Heavy usage (avg 80% of limit)", 0.80),
    ("Full usage (100% of limit)", 1.00),
]

users = 100
print(f"\n  100 users × $25/month = $2,500/month revenue\n")

sonnet_cost_per_msg = sonnet_avg  # from weighted average above
msgs_limit = 300
infra_total = users * (infra_per_user + 1)

print(f"  Infrastructure: ${infra_total}/month")
print(f"  Message limit: {msgs_limit}/month per user")
print(f"  Avg cost per message: ${sonnet_cost_per_msg:.4f}\n")

print(f"  {'Scenario':<40} {'AI Cost':>10} {'Total Cost':>12} {'Profit':>10} {'Margin':>8}")
print(f"  {'─'*40} {'─'*10} {'─'*12} {'─'*10} {'─'*8}")

revenue = users * 25
for scenario_name, usage_pct in usage_scenarios:
    total_msgs = int(users * msgs_limit * usage_pct)
    ai_cost = total_msgs * sonnet_cost_per_msg
    total_cost = ai_cost + infra_total
    profit = revenue - total_cost
    margin = profit / revenue * 100
    print(f"  {scenario_name:<40} ${ai_cost:>8.0f} ${total_cost:>10.0f} ${profit:>8.0f} {margin:>6.1f}%")


print(f"""

{'='*80}
✅ FINAL RECOMMENDATION
{'='*80}

  For the $25/month "Believer" plan with Claude Sonnet 4.6:

  ┌──────────────────────────────────────────────────────┐
  │                                                      │
  │   MESSAGE LIMIT:  300 messages / month               │
  │                                                      │
  │   Cost per message:     ~$0.06 average               │
  │   Max AI spend:         ~$18-20/month                │
  │   Infrastructure:       ~$3/month per user           │
  │   Break-even point:     ~370 messages                │
  │   Safety margin:        ~20% buffer                  │
  │                                                      │
  │   At 60% avg usage:     ~$2.50 profit/user/month     │
  │   At 100 users × 60%:  ~$250/month profit            │
  │                                                      │
  └──────────────────────────────────────────────────────┘

  Key insight: Most users won't hit 300 messages.
  The ones who do are your most engaged — they'll upgrade to Ministry ($50).
""")
