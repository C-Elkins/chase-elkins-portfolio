import { advancedLearningModules } from "./advanced-lessons.mjs";
import { advancedCheckQuestions } from "./advanced-check-questions.mjs";
import { advancedFinalQuestions } from "./advanced-final-questions.mjs";
import { advancedScenarios } from "./advanced-scenarios.mjs";

const hints = {
    architecture: [
        "Compare the failed primary with the backup's availability and the 200 Mbit/s demand.",
        "Choose a healthy backup or automatic failover with sufficient capacity; keep management restricted.",
        "For example, select the available backup at 300 Mbit/s and retain authorized-admin access."
    ],
    switching: [
        "Check root location, staff VLAN carriage and whether both bundle ends agree.",
        "A core root, a staff-carrying trunk and compatible LACP or static aggregation can satisfy the service.",
        "For example, choose Core A, staff VLAN and LACP on both ends; keep guest-to-staff access blocked."
    ],
    ospf: [
        "Compare the two area IDs and check whether replies can route back to the branch.",
        "The ordinary shared link needs matching areas; the advertised service and return route must both exist.",
        "For example, place both neighbors in area 0 and restore the return route without leaking a default."
    ],
    bgp: [
        "Provider A is unavailable. Separate the destination you accept from the prefixes you announce.",
        "Accept the documented destination from available B and export only owned prefixes.",
        "Provider preference A or B can work here because the model selects an available acceptable route."
    ],
    availability: [
        "A local link-up signal does not detect this failed upstream path. Examine the standby and reply path.",
        "Select the healthy standby automatically with service-path detection or manually, then plan for sessions.",
        "For example, use service-path tracking, a valid return through either gateway and supported state synchronization."
    ],
    ipv6: [
        "Inspect the default-router advertisement, AAAA answer, necessary ICMPv6 and the fixed 1400-byte path.",
        "A correct router advertisement and DNS answer still need essential ICMPv6 and a fitting MTU.",
        "Advertise the router, correct AAAA, allow required ICMPv6, choose 1280 or 1400 bytes and keep guests blocked."
    ],
    segmentation: [
        "Trace the staff flow and return state separately from guest and management restrictions.",
        "An early allow-any rule masks the guest deny. Translation does not replace an authorized service rule.",
        "Use a specific staff allow and guest deny, permit stateful replies, configure scoped translation and restrict management."
    ],
    infrastructure: [
        "Check the available DHCP service, staff scope, offered resolver and internal record before the client state.",
        "Apply corrected service options while the lease/cache is old; renew and refresh in a separate change.",
        "For example, use the secondary DHCP service, staff scope, internal resolver and correct record; apply, then refresh the client."
    ],
    performance: [
        "The bottleneck is 100 Mbit/s and the tunnel budget is 1400 bytes. Check shaping, fairness and packet size.",
        "Shape below the bottleneck, use fair or bounded priority and fit the TCP payload to the tunnel.",
        "For example, shape at 90 Mbit/s with fair queueing, inner MTU 1400 and automatic MSS; keep diagnostics allowed."
    ],
    operations: [
        "The name and direct route are independent faults. Compare the synthetic event clocks and evidence.",
        "Fix DNS and routing, use a common time reference and retain relevant synthetic evidence.",
        "Keep guest access blocked and choose a handoff that states production checks were not performed."
    ],
    capstone: [
        "Pin the failing service baseline. Partition the path, trunk, resolver/lease, tunnel, printer and policy symptoms.",
        "Apply the corrected resolver while the client lease is still old; renew it in a later change.",
        "Select a healthy backup, carry the staff VLAN, fit MSS to 1400 bytes, allow staff IPP, block guests and record rollback. Then renew and retest service and safety."
    ]
};

function makeBank(prefix, module, rows, final, offset) {
    return rows.map(([number, prompt, correct, wrong1, wrong2, wrong3, explanation], index) => {
        const lesson = module.lessons[number - 1];
        if (!lesson) throw new TypeError(`Invalid lesson in ${prefix}.`);
        const answer = (index + offset) % 4;
        const choices = [correct, wrong1, wrong2, wrong3];
        return {
            id: `${prefix}-${String(index + 1).padStart(2, "0")}`,
            prompt,
            options: choices.map((_, option) => choices[(option - answer + 4) % 4]),
            answer,
            explanation,
            objective: `Apply ${lesson.title.toLowerCase()}.`,
            study: `#${lesson.id}`,
            topic: final ? module.id : lesson.id
        };
    });
}

const modules = advancedLearningModules.map((module, index) => ({
    ...module,
    challenge: { brief: advancedScenarios[module.id].brief, hints: hints[module.id] },
    assessment: {
        count: 5,
        blueprint: module.lessons.map((lesson, lessonIndex) => ({ topic: lesson.id, count: lessonIndex < 2 ? 2 : 1 })),
        bank: makeBank(`advanced-${module.id}-check`, module, advancedCheckQuestions[module.id], false, index)
    }
}));

export const advancedCourse = {
    id: "advanced-networking", version: 1, routePrefix: "advanced",
    title: "Advanced Networking", shortTitle: "Advanced Networking",
    description: "An accelerated enterprise networking course after Applied Networking. Investigate resilient architecture, routing policy, dual-stack services and operations with original lessons and bounded, evidence-driven simulations.",
    pathwayTitle: "Design, investigate and verify the whole service.",
    pathwayDescription: "Build on Applied Networking through ten sequential enterprise modules. Each combines three lessons, a hands-on simulation and a knowledge check. Preserve service and safety, then resolve a separate multi-fault capstone before the final.",
    modules,
    capstone: {
        title: "Enterprise recovery capstone",
        description: "Combine routing, switching, DNS, client state, tunnel sizing, printer access and isolation in a separate simulated incident. Document a safe rollback and prove current service and safety with pinned evidence.",
        challenge: { brief: advancedScenarios.capstone.brief, hints: hints.capstone }
    },
    final: {
        count: 30,
        blueprint: modules.map(module => ({ topic: module.id, count: 3 })),
        bank: modules.flatMap((module, index) => makeBank(
            `advanced-${module.id}-final`, module, advancedFinalQuestions[module.id], true, index + 2
        ))
    }
};
