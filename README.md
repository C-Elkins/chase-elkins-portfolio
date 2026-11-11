# Chase Elkins - Portfolio Website

[![Deploy static site to GitHub Pages](https://github.com/C-Elkins/chase-elkins-portfolio/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/C-Elkins/chase-elkins-portfolio/actions/workflows/pages.yml)

> A modern, responsive portfolio showcasing my transition from IT Professional to Full-Stack Developer

**Live Demo:** [https://c-elkins.github.io/chase-elkins-portfolio/](https://c-elkins.github.io/chase-elkins-portfolio/)

---

## 👨‍💻 About Me

I'm a **Full-Stack Developer** with 8+ years of IT infrastructure experience, now specializing in building modern web applications. My unique background in system troubleshooting, network security, and team leadership gives me a comprehensive perspective on software development—understanding both technical requirements and business needs.

### 💼 Professional Background
- 🔧 **8+ Years** IT Infrastructure Management
- 🎓 **CompTIA Security+** Certified
- 🌐 **Full-Stack Development** Focus
- 🚀 **Remote-First** Approach

---

## 🛠️ Technical Skills

### Frontend Development
![JavaScript](https://img.shields.io/badge/-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![React](https://img.shields.io/badge/-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![HTML5](https://img.shields.io/badge/-HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/-CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

### Backend Development
![Java](https://img.shields.io/badge/-Java-007396?style=for-the-badge&logo=java&logoColor=white)
![Python](https://img.shields.io/badge/-Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Node.js](https://img.shields.io/badge/-Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Spring Boot](https://img.shields.io/badge/-Spring_Boot-6DB33F?style=for-the-badge&logo=spring&logoColor=white)
![Express](https://img.shields.io/badge/-Express-000000?style=for-the-badge&logo=express&logoColor=white)

### Databases
![PostgreSQL](https://img.shields.io/badge/-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![MySQL](https://img.shields.io/badge/-MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

### DevOps & Tools
![Git](https://img.shields.io/badge/-Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![Docker](https://img.shields.io/badge/-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![AWS](https://img.shields.io/badge/-AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Linux](https://img.shields.io/badge/-Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)
![VS Code](https://img.shields.io/badge/-VS_Code-007ACC?style=for-the-badge&logo=visual-studio-code&logoColor=white)

---

## ✨ Portfolio Features

- **🌙 Shared themes** - Light by default on every page, with a persistent dark/light toggle across the portfolio, case study, lab, confirmation, and 404 pages
- **🎨 Modern UI** - Gradient hero section with glassmorphism effects
- **🧭 Learning spotlight** - The homepage introduces the Engineering Lab, links directly to Network Studio, Networking 101, Networking 102 and Applied Networking, and distinguishes planned courses from material available now
- **🎯 Project Filtering** - Filter projects by status (All, Completed, In Progress, Planned)
- **🎪 Animated Skills** - Infinite scrolling skill icons in two directions
- **📱 Responsive Design** - Optimized for all devices and screen sizes
- **⚡ Performance** - Fast loading with optimized assets
- **♿ Accessible** - ARIA labels, semantic HTML, keyboard navigation
- **🔝 Scroll to Top** - Smooth navigation back to hero section
- **📧 Contact Form** - Functional form with Formspree integration
- **🎭 Smooth Animations** - Intersection Observer API for scroll effects

### Engineering Lab

Open [`lab.html`](lab.html) through a local HTTP server to explore the browser-only labs and learning guide. Every tab shares the compact header and horizontal experiment navigation, with the active section named beside the brand on desktop. Network Studio's optional “Show lab introduction” setting restores the expanded introduction across tabs for that visit without changing the other labs' scrolling layouts.

On the homepage, await `runHomepageLearningTests()` from `tests/home-learning.test.mjs` to check the spotlight's current lesson and quiz counts, destinations, planned labels, theme contrast, navigation, and responsive layout.

The Lab uses a compact **Explore lab** picker instead of a growing row of tabs. Courses and interactive labs are grouped and searchable; the current destination stays visible beside the picker. Selection, Escape, clicking outside, or tabbing away closes the library. Existing section/chapter URLs and browser Back/Forward still work. The library has a viewport-bounded overflow fallback for smaller windows and future additions, without making the navigation bar scroll.

On the Lab page, await `runLabHeaderTests()` from `tests/lab-header.test.mjs` to check shared header dimensions, section titles, navigation, optional introduction and chapter offsets. Await `runLabNavigationTests()` from `tests/lab-navigation.test.mjs` for the grouped picker, filtering, empty results, dismissal, active destination and expansion with additional entries.

### Applied Networking: From Theory to Troubleshooting

The **Courses** picker and homepage link to `lab.html#applied-networking`. This guided course follows the open Networking 101/102 references with eight modules and 24 original lessons: baseline investigation, addressing, segmentation, DHCP/DNS, transport/application evidence, wireless, VPN/performance, and a branch-office incident capstone.

Entry requires 16/20 on the readiness assessment. Each module requires **both** its hands-on practical and at least 4/5 on its knowledge check. All eight combined passes unlock the cumulative study guide and final exam; 24/30 passes the final. Attempts are untimed with unlimited retries and objective-specific study links. Questions are sampled using topic blueprints from 40 readiness, 80 module, and 60 final questions, with shuffled choices. A failed retake never erases an earned pass. Networking 101 and 102 remain open, optional, and visit-only.

The hybrid workbench has a selectable topology, a structured configuration editor, a simulated console, inspectable/steppable packet events, hints, rollback, a change summary, and pinned evidence. Desktop keeps the illustrated topology visible beside focused Configure/Test/Trace/Objectives panels in a viewport-bounded workspace; mobile adds a separate Topology view. Diagnostics and verification use the same local model. A practical requires a relevant failing baseline, fresh successful evidence, all required service outcomes, and preserved guest/management isolation; simply revealing a solution or pressing buttons cannot pass it. Changing a DHCP option does not silently rewrite an existing lease. Stale results are marked after a configuration change.

The console supports a bounded Windows-client dialect (`help`, `ipconfig /all`, `/renew`, `/flushdns`, `route print`, `ping`, `ping -f -l`, `nslookup`, `tracert`, `Test-NetConnection -Port`) and labeled teaching-device commands (`show ip route`, `show vlan brief`, `show interfaces trunk`, `show access-lists`, `wireless status`). It does **not** execute shell code, scripts, real network probes, or vendor software. `nslookup` bypasses the modeled OS cache. TCP diagnostics label any extra TLS/application evaluation as a separate teaching follow-up: real `Test-NetConnection` does not validate TLS. Packet events, wireless constraints, and path timing are simplified teaching output, not measured telemetry or packet captures.

Only this course saves progress locally under `portfolio-course:applied-networking`: versioned best assessment results, practical passes, resume position, validated workbench configuration, and minimal pinned evidence. Full console history, identity data, and exam answers are not persisted. Unfinished assessment drafts survive in-page navigation, not reloads. Storage/version errors are shown explicitly; an unreadable saved record is not silently overwritten. A confirmed **Reset course** clears only this course's progress, never the theme. Clearing browser data loses progress, private browsing may not retain it, and progress does not follow learners across browsers/devices.

These are client-side learning locks, not tamper-proof access control. Course completion is a local learning record, **not an accredited or independently verified certification**. There are no accounts, analytics, uploads, or external study dependencies.

Model checks: import the corresponding files from `tests/` and run `runCourseProgressionTests()` (`course-progression.test.mjs`), `runCourseProgressTests()` (`course-progress.test.mjs`), `runWorkbenchModelTests()` (`network-workbench-model.test.mjs`), `runWorkbenchConsoleTests()` (`network-workbench-console.test.mjs`), and `runAppliedContentTests()` (`applied-content.test.mjs`). Browser checks are in `tests/applied-course.test.mjs` and `tests/network-workbench.test.mjs`; run these on a disposable Lab visit because they exercise local progress and challenge state. Existing Lab/header, homepage, theme, 101/102, and Studio workspace/guide checks remain applicable.

Course checks: import `tests/networking-course.test.mjs` and call `runNetworkingCourseModelTests()` for question/answer coverage and exact grading. On the Lab page, await `runNetworkingCourseUITests()` for all 14 module goals, practice reveals, required-answer checks, answer explanations, retries, score invalidation, visit-only progress and unlocked navigation.

Networking 101 opens on a course overview rather than a continuous lesson page. Selecting a card shows only that module's one or two lessons. Desktop has a sticky, independently scrollable module navigator; smaller screens use a module picker. The header shows module position and previous/next links, and the overview offers a return link to the last module. Chapter/quiz fragments and browser Back/Forward select the corresponding module without rebuilding forms, so answers and expanded quizzes survive module switches. Await `runNetworkingCourseNavigationTests()` from the same test module for this routing and state retention.

- **Networking 102:** a deeper follow-up with 14 open modules: subnet math and VLSM, routing tables and longest-prefix match, OSPF/BGP, NAT/PAT, VLANs and trunking, Spanning Tree, IPv6 in practice, TCP reliability and congestion control, bandwidth-delay and latency math, DNS resolution and caching, Wi-Fi design, VPN tunnels and MTU, QoS, and packet-capture analysis. Each module links back to the 101 lessons it builds on instead of repeating them, and adds worked concepts, original accessible SVG graphs (line, bar, stacked and topology diagrams built by `js/course-charts.js`), comparison tables, practice reasoning, Studio links and an optional four-question test (56 questions). Chapters are generated from `js/networking-course-102.mjs` by `js/networking-102.js` and use the same renderer as 101 with a `learn102` prefix, so progress is tracked separately and kept only in page memory.
- **Networking 101:** an open beginner course with 14 modules across 18 lessons. Ten core modules cover packets and performance, hardware, addressing/subnets/ARP, DHCP/DNS, transport/ports, encapsulation, web connections, evidence-based troubleshooting, Wi-Fi and safer network habits. Four printer/shared-device modules cover setup and addressing, discovery and print protocols, drivers/queues/security, and support scenarios. Each module has learning goals, estimated reading time, deeper explanations, a practice scenario with revealable reasoning, and an optional three-question quiz (42 questions total). Quizzes explain correct and incorrect answers, support unlimited retries, and never lock other modules. The module map shows latest scores and the number of quizzes checked, not mastery or certification. Answers and progress stay in page memory across Lab tabs and reset on reload; there is no storage, account or upload. Existing subnet/printer tools and matching Studio lesson links remain available.
- **Network studio:** a compact, diagram-first English workspace with 39 searchable/category-filtered protocol lessons. The header names the selected lesson's primary OSI focus and highlights it among all seven numbered layers. Hovering or focusing a number shows an on-screen tooltip with the layer name, purpose and examples; clicking it opens the OSI guide at that layer; an accessible guide explains cross-layer limitations. Every protocol has original descriptions, port/identifier and data-format facts, operations, and standards links. Expand the active lesson's sidebar phases, switch between overview and phase details, and follow Network/Sequence views. Cmd/Ctrl-K or `/` searches protocols and phases with arrow/Enter navigation; `?` opens the shortcut guide. The modal library works on small screens; a control restores the full Lab introduction.
- Guided demonstrations use preconfigured actors and original conceptual scripts; the editable sandbox separately supports topology-aware DHCP, DNS, TCP, HTTP, and HTTPS/TLS lessons. Drag devices and palette items, use Cable mode, or use arrow keys for positioning. Office/home/failure scenarios, phones/printers, and original SVG device illustrations remain available. Play runs the full trace; Step animates the selected hop, whole message or phase, holding at that boundary. Pause freezes the packet in place; resume continues the same hop. The final arrival completes before playback stops. Replay, speed, diagram fit/focus, and full-screen remain available. The compact packet-flow table separates source, destination, protocol and explanation, with a lesson-specific legend and optional message index/stepping controls. Following scrolls only its packet/journal container; it never moves the page.
- Each message has a route/phase/explanation inspector with previous/next controls. Selected DHCP DORA, DNS query/answer, TCP handshake, HTTP GET/200, and ICMP Echo events also expose independently generated synthetic Ethernet/IPv4 examples with calculated checksums, decoded fields, and matching byte highlights. These examples use documentation addresses and are **not encodings/captures of the diagram**; padding/FCS omissions are explicit. Encrypted, aggregated, unsupported, or failed events receive no invented hex dump. Timings and sizes are not presented as measured. Cryptography/authentication in Network Studio is narrated, not executed.
- Guided diagrams use original polygon SVG illustrations, a fading isometric grid, and separate directional lanes. A deterministic scene layout reserves space for the entire illustration, name, and address. Routed lines detour around those bounds; dragging rejects collisions, and Reset layout restores safe positions without losing the trace. Active-message callouts choose unoccupied space, while a separate caption always retains the full explanation. Packet travel follows its routed lane, then holds with a receiving-node glow; reduced-motion mode displays the same state without travel. The builder retains its independent coordinate system. The locally hosted Share Tech Mono font is licensed under the SIL OFL; its license is in `assets/fonts/ShareTechMono-OFL.txt`.
- Original presentation choreography adds command-window popups, a stepped character reveal with a traveling caret, staggered phase details, message-card/row entrances, actor fades, and a smoothly framed camera. Command captions summarize the actual lesson event (for example `A? studio.test`); they never execute a command or send a request. Typing starts once per logical message, not again at every forwarding device. Complete explanations stay readable and available to assistive technology throughout; the decorative scene bubble is hidden from the accessibility tree. Presentation animations pause/resume with playback, retime when speed changes, and cancel on replay or lesson changes. Reduced-motion mode shows complete text immediately and removes presentation animations, including when that preference changes during playback.
- The guided scene director uses a source-device close-up for preparation, pulls back to the active message's complete route for packet exchanges, gives actual local events such as TLS certificate verification their own close-up, and returns to the real final receiver only after delivery. Framing stays stable across forwarding hops of one message, then follows the next message's route instead of keeping every actor in an entire phase on screen. Preparation gets extra reading time; typing waits for the opening camera move and packet launches briefly yield to a pullback. Message routes draw on as forwarding starts. Screen-space packet labels follow the actual animated packet and camera with an attached tether, avoid artwork where possible, and remain readable instead of shrinking with the diagram. Their positions and states freeze with playback. The final receiver gets an original output illustration and a summary of conceptual message/step counts, never invented latency or transfer sizes. These presentation stages add no actors or protocol events.
- All 39 guided lessons have explicit, unique opening entries with their own heading, typed text, and prerequisite context. HTTP and HTTPS open with reserved `.test` web addresses in a browser-style caption; DNS opens with an address-record lookup. The entry describes the user's intent, not an extra wire message: HTTP's first modeled DNS query remains visible in Packet Flow. Entries are also included in the accessible step explanation, reset on lesson changes, and use the same pause, speed, and reduced-motion controls as other captions. Addresses and command-like labels are illustrative text only, never navigated or executed.
- Playback uses one proportional timing model for 0.5×, 1×, 1.5×, and 2×: the opening reading scene lasts 7 seconds at 1×, travel takes 1 second per modeled hop, and each receiver gets a separate half-second hold. Actual local operations and new-message preparation have their own reading intervals. Camera, typing, route reveal, pause/resume, and speed changes share the selected ratio; these are teaching timings, not measured network latency. The field guide keeps the main explanation and key facts prominent, with transport/format/operations, phase message inspection, and model limits in expandable sections.
- Every one of the 39 lessons opens with an original, beginner-friendly explanation of what the protocol does, followed by three key facts. Each of the 160 phases has a short tagline and a plain-English explanation in the step view and library, and command search indexes all of this teaching text. `tests/network-guided.test.mjs` checks that the copy is complete, unique, aligned with each phase, and within length limits. `tests/network-guide.test.mjs` checks that the copy appears in the right place for every message. Pausing playback now completes panel entrance animations, so Step details never stay blank.
- `runNetworkPacingTests()` in `tests/network-pacing.test.mjs` measures the real opening dwell and travel effect at every speed. `runNetworkGuideTests()` in `tests/network-guide.test.mjs` checks every lesson opening, overview, and logical-message detail for desktop overflow; run it with reduced motion for deterministic geometry, at 1440×900, 1920×1080, 1280×720, and 1058×805. Expanded supporting material and smaller/mobile windows retain normal scrolling rather than clipping information.
- On desktop windows at least 1000×600, compact workspace controls reclaim diagram height and Packet Flow stays in a reserved visible row; only its table body scrolls. Fit diagram is a consistent pressed-state toggle, and enabling Follow packet restores Fit automatically if actual-size mode was selected. Sequence uses full participant names and addresses in a sticky header, readable message bands, directional/self-call arrows, and live progress synchronized with the packet table. Follow keeps the active sequence row within its own scrollport and never scrolls the page.
- Playback defaults to 0.5×, with the selected speed driving packet timing and presentation together. Ready-state artwork is immediately visible rather than depending on an entrance animation; loading another lab first or pausing a hidden tab cannot strand initial icons at zero opacity. Both directions of each modeled link have separate, visible arrowheads. Small scenes use a shallower diagonal composition for larger artwork. Compact desktop controls keep protocol search, the workspace selector, OSI indicators, settings and shortcuts in one row; smaller screens reflow naturally.
- The Lab uses the portfolio's shared light/dark palette and a single theme control in its global header. On larger desktop windows, the guided scene, overview and Packet Flow use bounded panes sized to the viewport; widescreens also show the inline protocol library with a compact numbered phase rail. Smaller windows and the editable builder use natural page scrolling. Desktop phase navigation stays in the library/drawer to leave more room for the scene. Packet rows appear as messages begin, with an explicit option to preview upcoming messages. Live row states, forwarding-device labels, message-progress bars and step details share the packet animation's transit, processing and paused state. Progress reads the real illustrative animation clock rather than a separate timer; a message is marked delivered only after its final hop arrives. Step details open when an exchange begins, with a live message card and phase-message list; Overview remains available. During exchanges, Follow packet keeps the current message's complete route and actors visible with stable framing through its forwarding hops, then moves to the next message's route; preparation, genuine local events and final delivery have deliberate close-ups. Turn Follow packet off to keep the full topology visible. Changing camera scope never interrupts packet travel. Fit includes all focused artwork, captions and local callouts. Actual-size mode can still scroll within the diagram. Reduced-motion mode disables traffic travel, camera motion, lane motion, pulses and transitions.
- Guided lesson progress tracks which message endpoints were explored during the current page visit, across lesson switches and replay. It is not a certification or comprehension score; reload or Reset visit progress clears it. Network Studio does not save experiment or progress state to storage. The shared theme and the separate Applied Networking course record are persisted as described above.
- **Algorithm theater:** step through bubble or insertion sort, replay identical input, and compare operation counts.
- **Signal room:** visualize a generated sine tone or a local audio file (up to 25 MB), with explicit play/stop and volume controls. Files are not uploaded or persisted.
- **Compression bench:** inspect raw image pixels, PCM audio, logs, repeated binary data, or pseudorandom bytes in hex/decimal/binary. An optional local file inspector reads only its first 4,096 bytes. Explore byte RLE, step through a bounded LZ-style dictionary, inspect Huffman prefix codes, and measure real DEFLATE against RLE. Teaching-format costs and codebook/padding exclusions are labeled explicitly. Create real ZIPs from up to 20 local files (10 MB combined); raw DEFLATE is used when supported and smaller, otherwise entries are explicitly stored. Shows payload versus archive overhead. No extraction, encryption, or uploads; filenames are flattened, sanitized, and deduplicated.
- **Encryption & Hashing Studio:** compare native SHA-256 digests with an exact 256-bit difference map. Generate a non-exportable AES-256-GCM session key, encrypt with fresh random 96-bit nonces and 128-bit authentication tags, decrypt, and demonstrate rejection of altered data or a different key. Input is bounded to 4,096 UTF-16 code units (at most 16,384 UTF-8 bytes). Messages and keys are never uploaded, exported, or persisted; Clear studio and page navigation discard the lab's references and inputs. There is no secure-memory-erasure guarantee. HTTPS or localhost and Web Crypto are required; unsupported browsers get an explicit explanation with crypto actions disabled. This teaches primitives, not password storage, identity verification, key exchange, or a production messaging protocol.
- **Subnet Sprint:** a subnetting puzzle game. Warm-up, Core and Expert sets generate fresh IPv4 problems in the browser: masks, prefixes, usable hosts, network/broadcast addresses, first/last hosts, same-subnet checks, wildcard masks and smallest-fitting prefixes. Answers are validated before grading, wrong answers can be retried, hints point to the next step, and Reveal shows the full binary working with network and host bits highlighted. Practice is untimed; Sprint mode gives 90 seconds with streaks and accuracy, and pauses when you leave the lab, hide the tab or navigate away. Scores last only for the current visit.
- **Firewall rule builder:** a mission-based sandbox for ordered allow/deny rules. Seven missions (website publishing, admin-only SSH, rule order, internal DNS, a least-privilege database, monitoring pings and a capstone) grade your rule list against fixed test packets using first-match-wins logic and a default policy. Each check can be traced to show which rules were skipped and which one decided. Live warnings flag shadowed or redundant rules, an allow-everything rule and a default-allow policy. A free sandbox and a packet tester let learners try their own traffic. Up to 20 rules; example addresses use private and documentation ranges. This is a teaching model of stateless filtering, not a real firewall: nothing is sent, applied or saved, and drafts reset on reload.

The lab has no third-party runtime dependencies. Its CSP blocks outbound script connections and form submissions; no microphone permissions are requested. Audio stops when the tab is hidden or the experiment changes. Reduced-motion mode uses a static audio canvas.

Run the dependency-free model checks with a working Node.js installation:

```bash
node tests/lab-model.test.mjs
node tests/network-protocols.test.mjs
node tests/network-guided.test.mjs
node tests/network-packets.test.mjs
node tests/network-scene.test.mjs
node tests/compression-model.test.mjs
node tests/compression-lessons.test.mjs
node tests/crypto-model.test.mjs
node tests/subnet-sprint-model.test.mjs
node tests/firewall-model.test.mjs
```

In the local browser preview, import `tests/lab-model.test.mjs` and call `runLabTests()`, import `tests/compression-model.test.mjs` and await `runCompressionTests()`, or import `tests/compression-lessons.test.mjs` and await `runCompressionLessonTests()`. ZIP checks verify headers, offsets, UTF-8 names, CRC-32, exact restored bytes, limits, and cancellation. Lesson checks verify binary dictionary round-trips, prefix-free Huffman decoding, bit costs, and dataset bounds.

Practice lab checks: `runSubnetSprintModelTests()` and `runFirewallModelTests()` cover subnet math, puzzle generation, rule parsing, first-match evaluation, warnings and every mission solution. On the Lab page, await `runSubnetSprintTests()` from `tests/subnet-sprint.test.mjs` and `runFirewallBuilderTests()` from `tests/firewall-builder.test.mjs` for grading, retries, hints, binary reveal, sprint timing and pausing, mission switching, rule editing/reordering, traces, the packet tester, focus handling, overflow and touch-target sizes.

Network checks: import `tests/network-protocols.test.mjs` and call `runProtocolTests()`, `tests/network-guided.test.mjs` and call `runGuidedNetworkTests()`, or `tests/network-packets.test.mjs` and call `runNetworkPacketTests()` for fact coverage, encoded lengths/fields and checksum verification. On the Lab page, await `runNetworkStudioTests()` from `tests/network-studio.test.mjs` for library/filtering, sequence/diagram synchronization, scrubbing, DHCP lease semantics, mode isolation, and troubleshooting. Then await `runNetworkExplorerTests()` from `tests/network-explorer.test.mjs` for all 39 OSI indicators, command/shortcut navigation, nested phases, message/table inspection, byte highlighting, visit progress and boundary playback. From the homepage (which allows test frames), await `runNetworkEnvironmentTests("/chase-elkins-portfolio/")` from `tests/network-environment.test.mjs` for mobile/themes, modal layouts/focus, diagram fitting, focus/scroll stability, builder layout, reduced motion, and timer cleanup. Use `"/"` for a root-path local server. Networking 101: import `tests/networking-basics.test.mjs` and call `runNetworkingBasicsModelTests()`, then on the Lab page await `runNetworkingBasicsUITests()` for OSI tooltips, chapters, the subnet checker, the troubleshooter and Studio links. Networking 102: import `tests/networking-course-102.test.mjs` and await `runNetworking102ModelTests()` and, on the Lab page, `runNetworking102UITests()` for curriculum shape, original questions, recall links, accessible graphs, tests, separate progress and routing.

The workspace interaction approach was inspired by [Protocol Explorer](https://protocol-explorer-alpha.vercel.app/). This portfolio uses its own implementation, illustrations, and lesson writing; no reference-site source, assets, or translations are bundled. This is not a pixel-identical clone or a claim of exhaustive parity: the English experience comes first, translations are deferred, and the synthetic byte encoders cover only the explicitly listed message formats rather than every event in all 39 protocols. Guided exchanges are bounded teaching scenarios, not wire-accurate captures, real network probes, or complete protocol stacks. The overview documents what each lesson leaves out.

For illustration/layout checks, call `runNetworkSceneTests()` from `tests/network-scene.test.mjs` for all 39 scenes' bounded artwork/captions, non-overlap, directed routes, callouts, and movement guards. On the Lab page, await `runNetworkSceneUITests()` from `tests/network-scene-ui.test.mjs` for actual rendered labels, role-specific artwork, directional lanes, packet travel/arrival, dropdown dismissal, and non-destructive layout reset.

On the Lab page, await `runNetworkPlaybackTests()` from `tests/network-playback.test.mjs` for real travel/arrival, freeze/resume, message/phase stepping, continuous playback, speed changes, the final hop, and the single global theme control.

On the Lab page, await `runNetworkMotionTests()` from `tests/network-motion.test.mjs` for command captions across all lessons, character reveal/caret timing, presentation pause/resume and speed changes, reduced motion, rapid navigation cleanup, accessible full explanations, and page-lifecycle pausing.

Await `runNetworkDirectorTests()` from `tests/network-director.test.mjs` for meaningful preparation zoom, delayed typing, local reading time, exchange pullbacks, moving screen-space labels/tethers, pause/resume, camera opt-out, final-delivery gating, receiver output, and TLS local-verification shots. Run in normal and reduced-motion browser contexts. `runNetworkSceneTests()` also checks camera shot plans for every step in all 39 lessons and label containment at diagram edges.

On the Lab page, await `runNetworkWorkspaceTests()` from `tests/network-workspace.test.mjs` for Fit/Follow recovery, message-route camera changes, sticky Sequence participants, independent scrolling, and visible desktop Packet Flow. With reduced motion enabled at desktop sizes at least 1000×700, await `runNetworkGuideTests()` from `tests/network-guide.test.mjs` to check all lessons' core overview/step details and fully readable active packet rows. In normal motion, `runNetworkPacingTests()` from `tests/network-pacing.test.mjs` checks real elapsed opening time and animation timing at all four playback speeds.

Import `tests/crypto-model.test.mjs` and await `runCryptoTests()` in the browser to check standard SHA-256/AES-GCM vectors, exact UTF-8 round-trips, non-exportable keys, bounds, fresh nonce generation, and rejection of altered ciphertext, tags, nonces, and wrong keys. Node.js cryptography checks require a modern runtime with global Web Crypto.

On the Lab page, import `tests/crypto-studio.test.mjs` and await `runCryptoStudioTests()` for UI state, literal-text rendering, rejection demos, and stale-operation/clear behavior. This test clears studio inputs and keys and ends on the one-character hashing example.

From the homepage preview (not the Lab, which blocks frames), import `tests/crypto-environment.test.mjs` and await `runCryptoEnvironmentTests("/chase-elkins-portfolio/")` for mobile/light/dark layouts, chapter links, navigation cleanup, and a simulated unsupported context. Use `"/"` instead when previewing without the GitHub Pages path prefix.

From the homepage preview, import `tests/theme.test.mjs` and await `runThemeTests()` to exercise all pages, saved choices, storage synchronization, and blocked saves. For this all-page test, serve the repository at both `/` and `/chase-elkins-portfolio/` so the production-rooted 404 assets resolve. The lab itself intentionally disallows iframes, so run this test from the homepage rather than the lab.

All five HTML pages load `js/theme.js` before their stylesheet to apply a saved preference without a dark-first flash. With no valid saved choice, light mode is used regardless of system theme; an explicit choice is shared through `portfolio-theme` local storage and synchronized across tabs. If storage is unavailable, the toggle still works for the current page and logs a warning. The 404 page uses root-relative `/chase-elkins-portfolio/` assets so nested missing URLs still resolve correctly on GitHub Pages.

The custom 404 includes a fictional router help desk and a keyboard-accessible six-port packet hunt. These are local-only jokes, not diagnostics; no requested URL is reflected, no network checks run, and the Home/Lab links work without JavaScript. Router motion respects reduced-motion preferences.

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: CSS Grid, Flexbox, CSS Custom Properties (CSS Variables)
- **Icons**: Font Awesome 6.0
- **Fonts**: Google Fonts (Inter)
- **APIs**: Intersection Observer, LocalStorage, Web Audio API
- **Forms**: Formspree
- **Deployment**: GitHub Pages
- **Version Control**: Git & GitHub

## 📁 Project Structure

```bash
portfolio/
├── index.html              # Main HTML file
├── lab.html                # Browser-only interactive Engineering Lab
├── 404.html               # Custom 404 error page
├── success.html           # Form submission success page
├── css/
│   ├── style.css          # Main stylesheet (dark mode, responsive)
│   ├── lab.css            # Engineering Lab styles
│   └── animations.css     # Animation definitions & keyframes
├── js/
│   ├── main.js           # Core functionality (nav, dark mode, scroll)
│   ├── lab.js            # Lab controls, playback, and local audio
│   ├── lab-model.mjs     # Pure topology and sorting models
│   ├── network-icons.mjs # Local SVG network symbols
│   ├── network-protocols.mjs # Topology-aware core protocol lessons
│   ├── network-guided.mjs # Original guided protocol catalog and exchanges
│   ├── network-lessons.mjs # Beginner intros, lesson facts, phase explanations
│   ├── network-explorer.js # Command search, shortcuts, progress and message inspector
│   ├── network-facts.mjs # Original protocol ports, formats and operations
│   ├── network-packets.mjs # Explicitly synthetic decoded wire-format examples
│   ├── network-scene.mjs # Collision-free illustrated layouts and directional routing
│   ├── compression.js    # Compression lesson and ZIP UI
│   ├── compression-model.mjs # RLE, CRC-32, and ZIP generation
│   ├── compression-lessons.mjs # Binary samples, dictionary, and Huffman lessons
│   ├── crypto-studio.js  # Local hash comparison and authenticated encryption UI
│   ├── crypto-model.mjs  # Bounded browser-native SHA-256 and AES-GCM
│   ├── theme.js          # Shared light-default theme and preference sync
│   └── projects.js       # Dynamic project rendering & filtering
├── images/
│   ├── profile.jpg       # Profile photo
│   └── projects/         # Project screenshots
├── assets/
│   ├── favicon.svg       # Site favicon
│   └── social-card.png   # Open Graph preview image
├── .github/
│   └── workflows/        # GitHub Actions (auto-deploy)
└── README.md             # Documentation
```

## 🎯 Portfolio Sections

### 1. 🏠 Hero Section
- Gradient background with wave overlay
- Animated typing effect for name
- Call-to-action buttons
- Social media links
- Profile image with gradient border

### 2. 👤 About Section
- Professional background summary
- Experience highlights with icons
- Interactive stat cards
- IT to development transition story

### 3. ⚡ Skills Section (NEW!)
- Infinite scrolling skill icons
- Two-directional animation (left & right)
- Hover to pause functionality
- Responsive icon sizing
- Glassmorphism background effect

### 4. 💼 Projects Section
- Dynamic project cards with status badges
- Filter by: All, Completed, In Progress, Planned
- GitHub & live demo links
- Tech stack tags
- Fade-in animations

### 5. 📬 Contact Section
- Functional contact form (Formspree)
- Contact information with icons
- Form validation
- Success/error notifications

## 🚀 Quick Start

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/C-Elkins/chase-elkins-portfolio.git
   cd chase-elkins-portfolio
   ```

2. **Open in VS Code**

   ```bash
   code .
   ```

3. **Run with Live Server**
   - Install Live Server extension in VS Code
   - Right-click on `index.html` → "Open with Live Server"
   - Or simply open `index.html` in your browser

4. **View in browser**
   - Navigate to `http://localhost:5500` (or the port Live Server assigns)

---

## 📝 Customization Guide

### Adding New Projects

Edit [js/projects.js](js/projects.js) and add to the `projects` array:

```javascript
{
    title: "Your Project Name",
    description: "Brief project description highlighting key features",
    tech: ["React", "Node.js", "MongoDB"],
    image: "🚀", // Emoji or image path
    github: "https://github.com/username/repo",
    demo: "https://your-demo-url.com",
    status: "completed" // or "in-progress" or "planned"
}
```

### Updating Personal Information

| File | What to Update |
|------|----------------|
| `index.html` | Contact details, social media links, email |
| `images/profile.jpg` | Replace with your profile photo |
| `assets/` | Add your resume PDF or other documents |
| `js/projects.js` | Your projects and tech stack |

### Customizing Theme Colors

Update CSS variables in [css/style.css](css/style.css):

```css
:root {
    --primary-color: #667eea;      /* Main brand color */
    --secondary-color: #764ba2;    /* Secondary brand color */
    --text-primary: #2d3748;       /* Main text color */
    --bg-primary: #ffffff;          /* Background color */
    /* ... customize other colors */
}
```

### Dark Mode Colors

```css
[data-theme="dark"] {
    --text-primary: #f7fafc;
    --bg-primary: #1a202c;
    /* ... dark theme overrides */
}
```

## 🌐 Deployment

**🔗 Live Site:** [https://c-elkins.github.io/chase-elkins-portfolio/](https://c-elkins.github.io/chase-elkins-portfolio/)

### Deploy to GitHub Pages

1. **Push to GitHub**

   ```bash
   git init
   git add .
   git commit -m "Initial portfolio commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository `Settings` → `Pages`
   - Source: `Deploy from a branch`
   - Branch: `main` / Folder: `/ (root)`
   - Click `Save`

3. **Wait for deployment**
   - GitHub Actions will automatically build and deploy
   - Your site will be live at: `https://YOUR-USERNAME.github.io/YOUR-REPO/`

### Alternative: Deploy to Netlify

1. **Quick Deploy**
   - Drag & drop project folder to [netlify.com/drop](https://app.netlify.com/drop)

2. **Or connect GitHub repo**
   - Sign in to Netlify → `New site from Git`
   - Connect repository
   - Deploy settings: Auto-detected
   - Click `Deploy site`

## 📱 Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ Latest |
| Firefox | ✅ Latest |
| Safari | ✅ Latest (iOS 12+) |
| Edge | ✅ Latest |
| Mobile | ✅ iOS & Android |

## ⚡ Performance & Optimization

- **Lighthouse Score**: 95+ Performance, 100 Accessibility
- **Load Time**: < 1.5s on 3G
- **Bundle Size**: < 50KB (uncompressed)
- **Optimizations**:
  - Preload critical assets (fonts, hero image)
  - Lazy loading for images
  - Intersection Observer for animations
  - Debounced scroll events
  - Minimized external dependencies

## 🎨 Design Philosophy

- **Modern Aesthetic**: Gradient-based color schemes with glassmorphism
- **Typography**: Inter font family for clean readability
- **Layout**: Flexbox & CSS Grid for responsive layouts
- **Animations**: Subtle, purposeful animations that enhance UX
- **Accessibility**: WCAG 2.1 AA compliant
- **Dark Mode**: Full theme support with smooth transitions

## 🔒 Security

For security disclosures, please see [SECURITY.md](./.github/SECURITY.md).

## 📄 License

**Code**: MIT License - see [LICENSE](./LICENSE)

**Content & Media**: © 2025 Chase Elkins. All images, logos, and written content are not licensed for reuse without permission.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Please refer to our [Code of Conduct](CODE_OF_CONDUCT.md).

## 📞 Contact

| Platform | Link |
|----------|------|
| 👨‍💻 GitHub | [@C-Elkins](https://github.com/C-Elkins) |

## 📬 Contact Form Setup

This portfolio uses [Formspree](https://formspree.io) for form handling:

1. **Create Formspree Account**
   - Sign up at [formspree.io](https://formspree.io)
   - Create a new form project

2. **Get Form Endpoint**
   - Copy your form ID (e.g., `meorjqpq`)

3. **Update index.html**
   ```html
   <form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```

4. **Configure Settings** (Optional)
   - Add allowed domains in Formspree dashboard
   - Set up email notifications
   - Customize success redirect

---

<div align="center">

**Built with ❤️ by [Chase Elkins](https://github.com/C-Elkins)**

*Full-Stack Developer | IT Professional | Problem Solver*

⭐ Star this repo if you found it helpful!

[View Live Site](https://c-elkins.github.io/chase-elkins-portfolio/) • [Report Bug](https://github.com/C-Elkins/chase-elkins-portfolio/issues) • [Request Feature](https://github.com/C-Elkins/chase-elkins-portfolio/issues)

</div>
