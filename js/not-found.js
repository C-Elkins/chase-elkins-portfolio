(() => {
    "use strict";
    const messages = [
        ["“I checked all 65,535 ports. Then remembered this is a website.”", "- _ -"],
        ["“The page said it was going to get milk. That was three deploys ago.”", "o . o"],
        ["“I found the problem. Someone put the cloud in airplane mode.”", "> _ <"],
        ["“Good news: your request arrived. Bad news: the page did not RSVP.”", "^ _ ^"],
        ["“I escalated your ticket to the office plant. It is still processing.”", "o _ o"],
        ["“My professional recommendation? The big green Home button.”", "^ . ^"]
    ];
    let joke = 0;
    const help = document.getElementById("router-boop");
    help.disabled = false;
    help.addEventListener("click", () => {
        const [message, face] = messages[joke++ % messages.length];
        document.getElementById("router-message").textContent = message;
        document.getElementById("router-face").textContent = face;
        help.textContent = joke >= messages.length ? "Ask again (the router has six jokes)" : "That was not helpful. Try again.";
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
            const body = document.querySelector(".router-body");
            body.getAnimations().forEach(animation => animation.cancel());
            body.animate([
                { transform: "rotate(-3deg)" },
                { transform: "rotate(3deg) translateY(-4px)" },
                { transform: "rotate(-3deg)" }
            ], { duration: 300, easing: "ease-out" });
        }
    });

    const ports = [...document.querySelectorAll("[data-packet-port]")];
    const result = document.getElementById("packet-result");
    const restart = document.getElementById("packet-restart");
    let target;
    let guesses;
    const reset = () => {
        target = Math.floor(Math.random() * ports.length);
        guesses = 0;
        ports.forEach((button, index) => {
            button.disabled = false;
            button.classList.remove("found");
            button.textContent = `Port ${String(index + 1).padStart(2, "0")}`;
            button.setAttribute("aria-label", `Search port ${index + 1}`);
        });
        result.textContent = "Pick a port. The packet promises it's in one of them.";
    };
    ports.forEach((button, index) => button.addEventListener("click", () => {
        guesses++;
        if (index === target) {
            button.classList.add("found");
            button.textContent = "[packet]";
            button.setAttribute("aria-label", `Packet found in port ${index + 1}`);
            ports.forEach(port => { port.disabled = true; });
            result.textContent = `Packet recovered in ${guesses} ${guesses === 1 ? "guess" : "guesses"}! The page is still missing, but your network career looks promising.`;
        } else {
            button.disabled = true;
            button.textContent = "Empty";
            button.setAttribute("aria-label", `Port ${index + 1} is empty`);
            result.textContent = ["Just dust and a suspiciously short Ethernet cable.", "No packet. We did find a cable labeled “DO NOT UNPLUG.”", "Nothing here. The packet has excellent hiding skills.", "An empty port. Very minimalist. Very on brand.", "Last port standing. Surely this is your moment."][guesses - 1];
        }
    }));
    restart.disabled = false;
    restart.addEventListener("click", reset);
    reset();
})();
