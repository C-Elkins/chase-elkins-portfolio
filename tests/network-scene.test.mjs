import { guidedLessons, guidedLesson } from "../js/network-guided.mjs";
import { layoutScene, sceneLane, sceneBounds, sceneDimensions, scenePosition, sceneRoute, segmentCrossesBounds, placeSceneCallout, directScene, placeFlightLabel } from "../js/network-scene.mjs";

export function runNetworkSceneTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    for (const id of Object.keys(guidedLessons)) {
        const source = guidedLesson(id).topology;
        const topology = layoutScene(source);
        const { steps } = guidedLesson(id);
        assert(directScene(topology, steps, 0).actors.length === topology.devices.length, `${id} starts with an honest full map`);
        assert(directScene(topology, steps, 1).kind === "prepare" && directScene(topology, steps, 1).actors.length === 1,
            `${id} opens with a deliberate single-device preparation close-up`);
        for (let index = 1; index <= steps.length; index++) {
            const shot = directScene(topology, steps, index);
            assert(shot.actors.every(actor => topology.devices.some(device => device.id === actor)), `${id}/${index} never invents an actor for a camera shot`);
            assert(shot.kind !== "complete", `${id}/${index} cannot show a result before final delivery`);
            if (shot.kind === "exchange") assert(steps.filter(step => step.packetId === steps[index - 1].packetId).every(step =>
                (step.edge || [step.node]).every(actor => shot.actors.includes(actor))), `${id}/${index} exchange shot retains the active message's complete route`);
        }
        const complete = directScene(topology, steps, steps.length, { delivered: true });
        assert(complete.kind === "complete" && complete.actors[0] === steps.at(-1).node, `${id} ends at the actual receiving actor, not an assumed client`);
        assert(directScene(topology, steps, 1, { follow: false }).actors.length === topology.devices.length, `${id} allows the directed camera to be disabled`);
        assert(source.devices[0].x !== topology.devices[0].x, `${id} layout never mutates the protocol model`);
        assert(topology.links.length === source.links.length && topology.devices.length === source.devices.length, `${id} artwork never adds fictional actors or links`);
        for (const device of topology.devices) {
            const bounds = sceneBounds(device);
            assert(bounds.left >= 0 && bounds.top >= 0 && bounds.right <= sceneDimensions.width && bounds.bottom <= sceneDimensions.height, `${id}/${device.name} whole illustration and labels fit the board`);
            for (const other of topology.devices.filter(item => item.id !== device.id)) {
                const b = sceneBounds(other);
                assert(bounds.right <= b.left || bounds.left >= b.right || bounds.bottom <= b.top || bounds.top >= b.bottom, `${id}/${device.name} never overlaps ${other.name}'s label or illustration`);
            }
            for (const viewport of [{ width: 285, height: 168 }, { width: 850, height: 400 }]) {
                for (const x of [0, viewport.width / 2, viewport.width]) for (const y of [0, viewport.height / 2, viewport.height]) {
                    const position = placeFlightLabel({ x, y }, viewport, [], 168, 64);
                    assert(position.x >= 10 && position.x + 168 <= viewport.width - 10
                        && position.y >= 10 && position.y + 64 <= viewport.height - 10, "Flight annotation stays inside small and large viewports");
                }
            }
            const callout = placeSceneCallout(topology, device);
            assert(callout && callout.x >= 0 && callout.y >= 0 && callout.x + 248 <= sceneDimensions.width && callout.y + 78 <= sceneDimensions.height, `${id}/${device.name} has room for a whole packet callout`);
            for (const other of topology.devices) {
                const b = sceneBounds(other);
                assert(callout.x + 248 <= b.left || callout.x >= b.right || callout.y + 78 <= b.top || callout.y >= b.bottom, `${id} packet callout never overlaps ${other.name}'s caption or artwork`);
            }
        }
        for (const [a, b] of topology.links) for (const [from, to] of [[a, b], [b, a]]) {
            const route = sceneRoute(topology, from, to, sceneLane);
            assert(route.length >= 2 && route.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)), `${id}/${from}-${to} has a finite directional route`);
            assert(route.every(point => point.x >= 0 && point.x <= sceneDimensions.width && point.y >= 0 && point.y <= sceneDimensions.height), `${id}/${from}-${to} route stays on the board`);
            for (let index = 1; index < route.length; index++) {
                for (const device of topology.devices) assert(!segmentCrossesBounds(route[index - 1], route[index], sceneBounds(device)), `${id}/${from}-${to} segment avoids ${device.name}'s artwork and caption`);
            }
        }
        const first = topology.devices[0], second = topology.devices[1];
        assert(scenePosition(topology, first.id, second.x, second.y) === null, `${id} rejects moving artwork on top of another actor`);
        const point = scenePosition(topology, first.id, -1000, -1000);
        if (point) {
            const bounds = sceneBounds({ ...first, ...point });
            assert(bounds.left >= 0 && bounds.top >= 0, `${id} movement clamps the entire caption inside board edges`);
        }
        for (const x of [120, 300, 480, 660, 840, 1000]) for (const y of [100, 200, 300, 400, 500]) {
            const point = scenePosition(topology, first.id, x, y);
            if (!point) continue;
            const moved = { ...topology, devices: topology.devices.map(device => device.id === first.id ? { ...device, ...point } : device) };
            for (const [a, b] of moved.links) for (const [from, to] of [[a, b], [b, a]]) {
                const route = sceneRoute(moved, from, to, sceneLane);
                assert(route.length > 1, `${id} moving an actor preserves reachable diagram lanes`);
                for (let index = 1; index < route.length; index++) {
                    assert(moved.devices.every(device => !segmentCrossesBounds(route[index - 1], route[index], sceneBounds(device))), `${id} routes avoid artwork and labels after permitted movement`);
                }
            }
        }
    }
    return { passed, message: `${passed} illustrated scene geometry assertions passed.` };
}
if (typeof window === "undefined") console.log(runNetworkSceneTests().message);
