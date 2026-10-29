# 5-Minute Viva Presentation Script — Ebon & Ivory

**Project Title**: Parallel Alpha-Beta Search for an Othello Engine: Comparing Root Splitting, Principal Variation Splitting (PVS), and the Young Brothers Wait Concept (YBWC).  
**Guidance**: Dr. Hingrajiya  

---

## ⏱️ Minute 0:00 – 0:45: Context & Problem Statement

> *"Good morning / afternoon. My project investigates parallel game-tree search for an Othello engine. While alpha-beta pruning achieves exponential reductions in sequential game trees, parallelising it is notoriously difficult because parallel branches must search without knowing future cutoffs, causing search overhead.*
>
> *To address this, I built and compared three parallel search strategies in C++17:*
> 1. **Root Splitting (P1)**: Simple partitioning at the root.
> 2. **Principal Variation Splitting (P2)**: Sequential PV search with parallel null-window scouts.
> 3. **Young Brothers Wait Concept (P3)**: Waiting for the eldest brother, then using work-stealing for younger siblings.
>
> *All algorithms share the exact same bitboard engine, evaluation weights, and move ordering, ensuring that differences come strictly from search efficiency."*

---

## ⏱️ Minute 0:45 – 1:30: Play Page Walkthrough

> *(Action: Open `http://localhost:5173/play` in browser)*
>
> *"This is 'Ebon & Ivory', our custom web frontend connecting via WebSocket to the C++ engine subprocess.*
>
> *Notice the aesthetic design: a dark study theme with a lacquered jade board, polished obsidian discs for Black, and pearl discs for White. Notice the breathing brass rings marking legal moves.*
>
> *(Action: Play square d3 / 19)*
>
> *Notice the 3D rotation flip: discs flip with a 450-millisecond Y-rotation staggered by Chebyshev distance from the placed square.*
>
> *Immediately, the C++ engine searches at depth 8 with 4 threads, streaming live `info` messages through FastAPI and returning its move. In the sidebar, you see the move history, current score, and session throughput."*

---

## ⏱️ Minute 1:30 – 2:30: Engine Lab & Real-Time Telemetry

> *(Action: Click the 'Engine Lab' tab in the sidebar or navigate to `/lab`)*
>
> *"Here in the Engine Lab, we inspect what the parallel engine is doing under the hood:*
> - **Evaluation Bar**: Centered at 0, tracking Black vs White positional advantage.
> - **NPS Gauge**: Real-time throughput, exceeding 1 to 2 million nodes per second on multi-core searches.
> - **Worker Thread Lanes**: Displays individual worker threads (W0–W3) and their dynamic states: `busy`, `idle`, or `stealing`.
> - **Event Counters**: Real-time counts of parallel splits, work steals, and beta-cutoff cancellations.
> - **Evaluation Breakdown (§5.2)**: Shows the 5 sub-terms comprising the evaluation score: mobility, corner occupancy, positional matrix weights, stability, and disc difference.*
>
> *Clicking 'Compare vs Sequential' instantly sets $P=1$ so examiners can observe how parallel speedup affects move choices."*

---

## ⏱️ Minute 2:30 – 3:45: Benchmarks Page & Interactive YBWC Stepper

> *(Action: Navigate to `/benchmarks`)*
>
> *"All benchmark numbers shown here come directly from our empirical engine experiments—never fabricated.*
>
> *(Action: Scroll to RQ1 & the YBWC Interactive Stepper)*
>
> *To answer Research Question 1—Search Overhead ($SO_P = N_P / N_1 - 1$)—we built this interactive SVG tree stepper:*
>
> *(Action: Click 'Next' to Step 2)*
> *Step 1: Under YBWC, worker W1 searches eldest child A sequentially, evaluating all 3 leaves and establishing $\alpha = 5$.*
>
> *(Action: Click 'Next' to Step 3)*
> *Step 2: With $\alpha = 5$, younger brothers B and C are stolen by W1 and W2. Their very first leaves (3 and 4) are $\le 5$, triggering immediate $\beta$-cutoffs. Leaves 6, 8, 7, and 9 are pruned completely—only 5 leaves visited!*
>
> *(Action: Click 'Root Splitting (No Wait)' toggle)*
> *In contrast, Root Splitting launches all three branches concurrently without waiting for $\alpha$. It must explore all 9 leaves, producing an 80% search overhead.*
>
> *Scrolling to RQ2 shows our Speedup $S_P = T_1 / T_P$ and Efficiency $E_P = S_P / P$ scaling up to 8 threads."*

---

## ⏱️ Minute 3:45 – 4:30: Verification & Tournament Results

> *(Action: Click the 'Verification' and 'Tournament' tabs)*
>
> *"Correctness is paramount: in our Verification suite, P1, P2, and P3 match the sequential B2 engine value 100% of the time across all tested depths and configurations.*
>
> *In the Tournament tab, we ran a round-robin tournament comparing:*
> - P3 (YBWC at 8 threads)
> - B2 (Sequential Alpha-Beta)
> - B0 (Greedy baseline)
> - B0 (Random baseline)*
>
> *YBWC achieves an 83.3% win rate and a +25.7 mean disc differential with 95% confidence intervals, demonstrating strong tactical play."*

---

## ⏱️ Minute 4:30 – 5:00: Conclusions & Q&A

> *"In conclusion, while Root Splitting is easy to implement, its lack of mid-search bound sharing causes severe search overhead. YBWC with work stealing preserves the tight pruning windows of sequential alpha-beta while scaling effectively across multi-core systems.*
>
> *The entire application is containerized with Docker, thoroughly covered by unit and E2E integration tests, and strictly typed.*
>
> *Thank you, and I look forward to your questions."*

