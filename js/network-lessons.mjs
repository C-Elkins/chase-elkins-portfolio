// Original beginner teaching copy for every guided lesson.
// Each phase entry is [tagline, plain-English explanation].
const lessons = {
    http: {
        intro: "HTTP is how a browser asks a web server for a page, image or API result and gets an answer back. Each request names a method and a path, and every response starts with a status code such as 200 OK or 404 Not Found.",
        facts: [["Model", "Request and response, one at a time"], ["Example", "GET / at http://demo.test"], ["Privacy", "Plain text; anyone on path can read it"]],
        phases: {
            Resolve: ["finds the server address", "The browser only knows the name demo.test, so it asks a DNS resolver for the matching IP address. Nothing can be sent to the web server until the name becomes a number."],
            Connect: ["opens a TCP connection", "A three-way TCP handshake (SYN, SYN-ACK, ACK) gives both sides a reliable byte stream. HTTP rides on top of it, so lost pieces will be resent automatically."],
            Request: ["asks for a page", "The browser sends a GET request with the path, the Host header and a few hints about what it accepts. Because this is plain HTTP, every word is readable on the wire."],
            Respond: ["returns status and content", "The server replies with 200 OK, headers that describe the content, and then the page itself. The browser reads the status first to decide what to do next."]
        }
    },
    https: {
        intro: "HTTPS is ordinary HTTP inside a TLS tunnel, so pages and passwords travel encrypted and the browser can prove it reached the real site. Observers see which server you contacted, not what you asked for.",
        facts: [["Adds", "Encryption and server identity"], ["Example", "https://demo.test/account"], ["Proof", "Certificate checked against trusted CAs"]],
        phases: {
            "Resolve visibly": ["name lookup is still public", "Before any encryption starts, the browser looks up demo.test with a normal DNS query. That lookup is visible to the network, which is why encrypted DNS exists as a separate idea."],
            Connect: ["opens a TCP connection", "SYN, SYN-ACK and ACK set up a reliable stream to port 443. At this moment nothing is secret yet; the connection is just a pipe waiting for TLS."],
            Authenticate: ["proves the server and agrees keys", "TLS hellos agree on keys, then the server sends a certificate the browser checks against trusted authorities. Only when the name and signature match does the browser continue."],
            "Exchange encrypted HTTP": ["sealed request and reply", "The same HTTP request and response now travel as encrypted TLS records. Watchers see only sizes and timing, not paths, cookies or content."]
        }
    },
    websocket: {
        intro: "WebSocket turns a normal web connection into a two-way channel that stays open. Instead of asking again and again, the server can push updates the moment they happen, which suits chat, dashboards and games.",
        facts: [["Starts as", "HTTP request with an Upgrade header"], ["Example", "wss://demo.test/live"], ["Data unit", "Small text or binary frames"]],
        phases: {
            Connect: ["opens a TCP connection", "WebSocket starts life as a web request, so it first needs an ordinary TCP connection to the live service. The handshake gives a reliable stream both sides can share."],
            Upgrade: ["switches protocols", "The browser sends an HTTP request asking to upgrade. The service answers 101 Switching Protocols, and from then on the same connection speaks WebSocket instead of HTTP."],
            "Exchange frames": ["either side can talk", "Messages now travel as compact frames in both directions without new requests. The service can push a fresh update the instant it has one."],
            Close: ["says goodbye cleanly", "Either side sends a Close frame with a reason code, and the other side answers. A clean close lets the app tell a normal goodbye apart from a dropped connection."]
        }
    },
    webrtc: {
        intro: "WebRTC lets two browsers send audio, video or data straight to each other instead of through a server. The hard part is finding a path through routers and firewalls, then encrypting the media.",
        facts: [["Path finding", "ICE with STUN checks"], ["Security", "DTLS keys, SRTP media"], ["Needs", "App signaling channel"]],
        phases: {
            Signal: ["peers swap descriptions", "WebRTC does not define how peers first meet, so an app server relays an offer and an answer. They describe codecs, key fingerprints and how to reach each side."],
            "Gather candidates": ["learns possible addresses", "Each peer asks a STUN service what its public address looks like from outside. Local, public and relay addresses all become candidates the peers might use."],
            "Check ICE": ["tests which path works", "The peers send small STUN checks across candidate pairs to see which ones actually get through. The best working pair is nominated as the media path."],
            "Authenticate transport": ["proves keys match", "A DTLS handshake runs over the chosen path. Each side checks that the certificate fingerprint matches the one sent during signaling, which blocks a stranger in the middle."],
            "Stream media": ["sends encrypted audio and video", "Media now flows as SRTP packets protected by keys from DTLS. SRTCP feedback reports loss and delay so the sender can adjust quality."]
        }
    },
    sip: {
        intro: "SIP sets up, changes and ends internet phone and video calls. It works like a polite conversation of requests and numbered replies, while the actual voice travels separately in RTP packets.",
        facts: [["Like", "A phone’s ring and pick-up"], ["Style", "Text requests with numbered replies"], ["Voice", "Carried separately in RTP"]],
        phases: {
            Invite: ["asks to start a call", "The caller sends INVITE to its SIP proxy, which finds the callee and forwards it. The invite carries a description of the audio formats the caller can use."],
            Answer: ["rings, then picks up", "The callee replies 180 Ringing while the phone alerts, then 200 OK when someone answers. Each reply retraces the proxy path back to the caller."],
            Acknowledge: ["confirms the answer", "The caller sends ACK to confirm it received 200 OK. This three-way pattern makes sure both sides agree the call is really up."],
            "Carry audio": ["voice flows directly", "Voice now travels in RTP packets using the agreed codec. SIP stays quiet in the background, ready to change or end the call."],
            "End call": ["hangs up both sides", "One party sends BYE through the proxy and the other answers 200 OK. Both phones release the audio path and the call is over."]
        }
    },
    rtsp: {
        intro: "RTSP is a remote control for media streams, often used by security cameras. It describes a stream, sets up delivery and then lets the viewer play, pause or stop, while RTP carries the actual video.",
        facts: [["Common use", "IP security cameras"], ["Commands", "DESCRIBE, SETUP, PLAY, TEARDOWN"], ["Media path", "Separate RTP flow"]],
        phases: {
            Describe: ["what is in the stream", "The player asks the media server to describe the stream. The answer lists tracks, codecs and timing so the player knows what it is about to receive."],
            "Set up": ["agrees how media arrives", "SETUP picks a track and agrees transport details such as ports. The server returns a session ID that ties later commands to this viewer."],
            Play: ["starts the video", "PLAY tells the server to begin. RTP packets with video start flowing toward the player while RTSP waits for the next command."],
            "Tear down": ["stops and frees resources", "TEARDOWN ends the session. The server stops sending media and releases the ports and memory it reserved for this viewer."]
        }
    },
    rtmp: {
        intro: "RTMP is a streaming protocol that encoders use to push live video to an ingest server, such as when a streamer goes live. It splits audio and video into small chunks over one long TCP connection.",
        facts: [["Common use", "Going live from an encoder"], ["Direction", "Encoder publishes to ingest"], ["Data unit", "Interleaved message chunks"]],
        phases: {
            Connect: ["opens a TCP connection", "The encoder first opens a reliable TCP connection to the ingest server on port 1935. Everything after this rides on that one stream."],
            "RTMP handshake": ["checks both sides speak RTMP", "Fixed-size C0, C1 and C2 packets are swapped with S0, S1 and S2. This confirms the version and lets each side echo the other’s data."],
            "Create stream": ["connects to an app", "The encoder sends connect for the ingest application, then createStream. The server replies with a stream ID that later media will use."],
            Publish: ["goes live", "publish names the stream and the server answers onStatus to accept it. Audio and video chunks then flow continuously until the stream stops."]
        }
    },
    quic: {
        intro: "QUIC is a modern transport that runs over UDP and builds encryption in from the very first packet. It joins connection setup and the TLS handshake, and it carries many independent streams so one loss does not stall the rest.",
        facts: [["Runs over", "UDP port 443"], ["Used by", "HTTP/3"], ["Security", "TLS 1.3 built in"]],
        phases: {
            Initial: ["hello and keys in one go", "The first QUIC packet already carries a TLS ClientHello. Setup and encryption start together, with no separate TCP handshake."],
            Handshake: ["server proves itself", "The server sends its hello, then an encrypted certificate flight. The client checks it and sends Finished."],
            Confirm: ["handshake is done", "The server sends HANDSHAKE_DONE. Both sides can now drop the early keys and use only the full 1-RTT keys for everything."],
            Multiplex: ["many streams, one link", "HTTP/3 requests travel on separate QUIC streams. If one packet is lost, only its stream waits; the other streams keep moving."]
        }
    },
    tcp: {
        intro: "TCP turns an unreliable network into a dependable byte stream. It numbers every byte, waits for acknowledgements and resends anything lost, so applications receive data complete and in order.",
        facts: [["Setup", "SYN, SYN-ACK, ACK"], ["Guarantees", "Ordered, acknowledged delivery"], ["Recovery", "Retransmits missing segments"]],
        phases: {
            Handshake: ["three-way hello", "SYN, SYN-ACK and ACK let both sides agree on starting sequence numbers. After the third message, either side can send data and track exactly what arrived."],
            Send: ["numbered segments travel", "Data is sent in numbered segments and the receiver acknowledges what it got. Here segment B is lost on the way, so its acknowledgement never comes."],
            Recover: ["resends what went missing", "With no acknowledgement for B, the sender retransmits it. The receiver now has every byte in order and confirms with an ACK."],
            Close: ["finishes politely", "A FIN says no more data will come from this side, and an ACK confirms it. Closing cleanly lets both ends know the stream ended on purpose."]
        }
    },
    udp: {
        intro: "UDP sends small independent messages called datagrams with almost no overhead. There is no handshake, ordering or retry, which makes it fast and simple for games, voice, DNS and protocols that handle loss themselves.",
        facts: [["Setup", "None; just send"], ["Header", "8 bytes: ports, length, checksum"], ["Guarantees", "No ordering or delivery promise"]],
        phases: {
            Address: ["picks source and destination", "The app chooses a destination IP and port, and the system picks a source port. That is the whole setup; nothing is sent to ask permission."],
            Deliver: ["one datagram arrives", "Datagram A crosses the network and arrives intact. The receiver hands it straight to the waiting app, with no acknowledgement sent back."],
            Lose: ["one goes missing", "Datagram B is dropped along the way. UDP itself never notices, so nothing resends it; the app decides whether that matters."],
            Continue: ["keeps going anyway", "Datagram C arrives as if nothing happened. For live audio or games, skipping a late packet is often better than waiting for a resend."]
        }
    },
    ip: {
        intro: "IP is the addressing and forwarding system of the internet. Every packet carries a source and destination address, and each router looks only at the destination to pick the next hop, one link at a time.",
        facts: [["Address size", "IPv4 uses 32-bit addresses"], ["Forwarding", "Hop by hop, longest prefix match"], ["Loop guard", "TTL drops by one at each router"]],
        phases: {
            "Choose next hop": ["checks the routing table", "The laptop compares the destination with its routing table. The address is not local, so the packet goes to the default gateway instead."],
            Forward: ["router to router", "Each router reads the destination, lowers the TTL and sends the packet out the best interface. No router needs to know the whole path, just the next step."],
            Deliver: ["reaches the destination", "The last router finds the destination on a directly attached network and delivers it. The host then hands the payload to TCP, UDP or another upper protocol."]
        }
    },
    bgp: {
        intro: "BGP is how separate networks on the internet tell each other which addresses they can reach. Each network, called an autonomous system, shares routes with neighbours and applies its own policy about which paths to trust and use.",
        facts: [["Transport", "TCP port 179"], ["Speaks between", "Autonomous systems"], ["Decides by", "Policy, then path"]],
        phases: {
            "Establish TCP": ["connects the neighbours", "Two border routers open a TCP connection on port 179. BGP relies on TCP for reliable delivery instead of building its own."],
            "Open session": ["introduces each AS", "OPEN messages share each router’s AS number, ID and timers. KEEPALIVE confirms the session, and the neighbours are now established."],
            Advertise: ["shares a reachable prefix", "An UPDATE announces a block of addresses with the AS path it came through. The neighbour now knows one more way to reach that network."],
            "Apply policy": ["decides whether to use it", "The receiving router filters the route through local policy and compares it with other paths. Only the chosen best route is installed for forwarding."],
            Withdraw: ["takes the route back", "If the prefix stops being reachable, an UPDATE withdraws it. Neighbours remove the route and fall back to another path if one exists."]
        }
    },
    ipv6: {
        intro: "IPv6 is the newer version of IP with vastly more addresses, written in hexadecimal like 2001:db8::1. Devices can often build their own address from router hints, then check that no one else is already using it.",
        facts: [["Address size", "128 bits"], ["Auto-config", "SLAAC from router advertisements"], ["Neighbour tools", "ICMPv6 replaces ARP"]],
        phases: {
            "Discover router": ["asks who routes here", "The host sends a Router Solicitation, and the router replies with an advertisement. It shares the network prefix and whether hosts may self-configure."],
            "Form tentative address": ["builds its own address", "The host joins the advertised prefix with an ID it picks itself. The address stays tentative until it proves it is unique."],
            "Check uniqueness": ["is anyone using it?", "Duplicate Address Detection asks whether another device owns this address. Silence during the wait means it is unique."],
            "Use IPv6": ["starts real traffic", "The address becomes preferred and the host sends application data over IPv6. Traffic leaves through the router it learned about earlier."]
        }
    },
    dns: {
        intro: "DNS is the internet’s phone book, turning names like demo.test into IP addresses. A resolver does the legwork, walking down from the root to the authority for the name, then caching the answer to speed up later lookups.",
        facts: [["Record example", "A record: name to IPv4"], ["Lookup path", "Root, then TLD, then the zone"], ["Speed trick", "Answers cached for their TTL"]],
        phases: {
            "Ask resolver": ["hands off the question", "The laptop sends one recursive query to its resolver and waits. The resolver promises to do all the remaining work and return a final answer."],
            "Follow referrals": ["walks down the tree", "The resolver asks a root server, which points to the .test servers, which in turn point to the zone’s own servers. Each referral narrows the search."],
            "Read authority": ["gets the real answer", "The zone’s authoritative server holds the actual record. It replies with demo.test’s address and how long the answer may be cached."],
            "Cache and reply": ["remembers and answers", "The resolver stores the answer for its TTL and returns it to the laptop. The next person who asks gets it instantly from cache."]
        }
    },
    doh: {
        intro: "DNS over HTTPS sends name lookups inside an encrypted HTTPS connection instead of as plain DNS. Networks along the way can see that you talked to a resolver, but not which names you looked up.",
        facts: [["Looks like", "Ordinary HTTPS traffic"], ["Message", "Standard DNS inside HTTP"], ["Hides", "Query names from on-path observers"]],
        phases: {
            Connect: ["opens a TCP connection", "The laptop connects to the DoH resolver on port 443, the same port as ordinary web traffic. No DNS question has been sent yet."],
            "Authenticate resolver": ["proves it is the right resolver", "A TLS handshake agrees keys and checks the resolver’s certificate. This stops someone on the network from pretending to be the resolver."],
            "Query privately": ["asks inside HTTPS", "The DNS question is packed into an HTTP POST and encrypted by TLS. Onlookers see a web request but cannot read the name being looked up."],
            "Return answer": ["answer comes back sealed", "The resolver replies with HTTP 200 carrying a normal DNS answer. The laptop unpacks it and uses the address just like any other lookup."]
        }
    },
    dnssec: {
        intro: "DNSSEC adds digital signatures to DNS records so a resolver can prove an answer really came from the zone owner. It does not hide lookups; it stops forged or altered answers from being trusted.",
        facts: [["Protects", "Authenticity and integrity"], ["Does not", "Encrypt or hide queries"], ["Trust", "Chain of keys up to the root"]],
        phases: {
            "Request validation": ["asks for a checked answer", "The laptop asks its validating resolver for demo.test. It trusts the resolver to verify signatures before handing anything back."],
            "Fetch signed data": ["collects records and signatures", "The resolver asks with the DO bit set, getting the record plus its RRSIG signature. It also fetches the zone’s DNSKEY to check that signature."],
            "Validate chain": ["checks every signature", "The resolver verifies the signature with the zone key, then links that key to its parent and on to the trusted root. One broken link fails the lookup."],
            "Report secure result": ["answers with proof", "The resolver returns the address with the AD flag meaning it was authenticated. A forged answer would have been rejected instead of passed on."]
        }
    },
    dhcp: {
        intro: "DHCP gives a new device what it needs to join a network: an IP address, subnet mask, gateway and DNS servers. Each address is a lease that lasts a set time and is renewed while the device stays.",
        facts: [["Provides", "Address, gateway and DNS"], ["Exchange", "DORA, four messages"], ["Lease", "Renewed at half its lifetime"]],
        phases: {
            Discover: ["shouts for a server", "The device has no address yet, so it broadcasts a DISCOVER to everyone on the local network. Any DHCP server that hears it can respond."],
            Offer: ["server proposes an address", "A DHCP server picks a free address and offers it along with the mask, gateway, DNS servers and lease time. Nothing is final yet."],
            Request: ["accepts out loud", "The device broadcasts a REQUEST for that offer. Broadcasting tells any other server that its offer was not chosen and can be freed."],
            Acknowledge: ["the address is confirmed", "The server sends ACK and records the lease. The device configures the address, gateway and DNS and can now reach the wider network."]
        }
    },
    icmp: {
        intro: "ICMP is IP’s messenger for status and errors. Tools like ping use it to check if a host is alive, and routers use it to report problems such as a packet expiring before it reached its destination.",
        facts: [["Carried in", "IP, protocol number 1"], ["Used by", "ping and traceroute"], ["Reports", "Unreachable, time exceeded and more"]],
        phases: {
            "Echo request": ["are you there?", "The laptop sends an Echo Request to the remote host. This is what the ping command does under the hood."],
            "Echo reply": ["yes, I’m here", "The host answers with an Echo Reply carrying the same data. The round trip time shows how far away and how busy the path is."],
            "Expire TTL": ["a packet runs out of hops", "A probe is sent with a very small TTL. Each router lowers it, and it reaches zero partway along the path."],
            "Report error": ["router explains why", "The router that dropped the packet sends back Time Exceeded. Traceroute uses these replies to map every router on the path."]
        }
    },
    igmp: {
        intro: "IGMP lets a device tell its local router which multicast groups it wants to hear, like tuning into a channel. The router then forwards that group’s traffic only to networks with interested listeners.",
        facts: [["Scope", "Host to local router"], ["Group range", "IPv4 224.0.0.0/4"], ["Used for", "IPTV, discovery, live feeds"]],
        phases: {
            Join: ["tunes into a group", "The laptop sends a membership report naming the group it wants. The router notes that someone on this network is listening."],
            "Forward group traffic": ["the stream starts flowing", "Multicast data from the source now reaches the router and is copied onto this network. Hosts that did not join simply ignore it."],
            "Refresh membership": ["still listening?", "The router periodically sends a general query. The laptop answers with its current groups so the router keeps forwarding."],
            Leave: ["tunes out", "The laptop reports that it no longer wants the group. If no one else is listening, the router stops sending that traffic here."]
        }
    },
    ntp: {
        intro: "NTP keeps computer clocks accurate by comparing them with time servers. It measures how long messages take to travel and adjusts the local clock gradually, which matters for logs, certificates and security tokens.",
        facts: [["Server tiers", "Strata, counted from a reference"], ["Uses", "Four timestamps per exchange"], ["Adjusts", "Slews gradually instead of jumping"]],
        phases: {
            Request: ["asks for the time", "The laptop sends a request stamped with its own send time. It also remembers that moment so it can measure the round trip."],
            Respond: ["server stamps it twice", "The server records when the request arrived and when its reply leaves. Those two stamps travel back to the laptop."],
            Estimate: ["works out the offset", "With four timestamps the laptop calculates network delay and how far its clock is off. Assuming similar delay each way gives a good estimate."],
            "Discipline safely": ["adjusts without jumps", "The laptop compares several samples and rejects outliers before correcting. Small errors are fixed by gently speeding or slowing the clock."]
        }
    },
    ethernet: {
        intro: "Ethernet moves frames between devices on the same local network using hardware MAC addresses. A switch learns which port each device sits behind, so it can send frames only where they need to go.",
        facts: [["Address", "48-bit MAC like 02:00:5e:10:00:0a"], ["Device", "Learning switch"], ["Unknown target", "Flood to every other port"]],
        phases: {
            "Learn source": ["remembers who sent it", "Station A sends a frame to B. The switch records that A’s MAC address lives behind the port it came in on."],
            "Flood unknown destination": ["copies to every port", "The switch does not know where B is yet, so it sends a copy out every other port. Station C ignores a frame that isn’t for it."],
            "Learn reply": ["learns the other side", "Station B answers A. The switch now records B’s port as well, so it knows both ends of the conversation."],
            "Unicast known destination": ["sends straight there", "The next frame for B goes only out B’s port. Other stations no longer see the traffic, saving bandwidth."]
        }
    },
    pppoe: {
        intro: "PPPoE lets an internet provider run a separate, logged-in PPP session for each subscriber over a shared Ethernet network. It is common on DSL and some fibre links where customers sign in with a username.",
        facts: [["Discovery", "PADI, PADO, PADR, PADS"], ["Session", "PPP with LCP and IPCP"], ["Overhead", "8 bytes; MTU often 1492"]],
        phases: {
            Discover: ["looks for an access server", "The subscriber router broadcasts PADI asking for a concentrator. Any that can serve it reply with a PADO offer."],
            "Select session": ["picks a server and session ID", "The router requests one concentrator with PADR. The reply PADS assigns a session ID that tags all later frames."],
            "Negotiate PPP": ["agrees link and IP settings", "Inside the session, PPP’s LCP agrees link options and handles login. IPCP then hands the router its public IP address."],
            "Carry IP": ["internet traffic flows", "Ordinary IP packets are now wrapped in PPP and PPPoE headers. The concentrator unwraps them and routes them onward."]
        }
    },
    wifi: {
        intro: "Wi‑Fi (802.11) connects devices to a network over radio. A device first finds an access point, then authenticates and associates with it, and after that its frames are bridged onto the wired network.",
        facts: [["Standard", "IEEE 802.11"], ["Found by", "Beacons and probe responses"], ["This lesson", "Open network, no encryption"]],
        phases: {
            Discover: ["finds nearby networks", "Access points broadcast beacons with their network name. The station can also send a probe request and get a direct response."],
            "Open authentication": ["a simple hello", "On an open network this step accepts anyone. It is a formality from the standard, not a real security check."],
            Associate: ["joins the access point", "The station asks to associate and the access point grants an association ID. The station is now a member of this network."],
            "Bridge data": ["frames reach the LAN", "The access point translates 802.11 frames into Ethernet and back. Without WPA protection, nearby radios could read this traffic."]
        }
    },
    wpa3: {
        intro: "WPA3 protects Wi‑Fi with stronger password handling and encryption. Its SAE handshake proves both sides know the password without ever sending it, which also blocks offline password guessing from captured traffic.",
        facts: [["Password step", "SAE (Dragonfly) exchange"], ["Key install", "EAPOL four-way handshake"], ["Bonus", "Protected management frames"]],
        phases: {
            "SAE commit": ["commits to a secret", "Each side sends a value derived from the password and a random number. Neither value reveals the password to someone listening."],
            "SAE confirm": ["proves the password matches", "Both sides send a confirm that only works if they used the same password. Success produces a fresh shared key for this session."],
            Associate: ["joins the access point", "With SAE done, the station associates. The access point now knows this device and the security it will use."],
            "Install traffic keys": ["four-way key handshake", "Four EAPOL-Key messages turn the SAE result into encryption keys. Each side proves it has them before any data is accepted."],
            "Protect frames": ["encrypted Wi‑Fi traffic", "Data frames are now encrypted and integrity checked. Someone nearby can see radio activity but not read or alter the contents."]
        }
    },
    radius: {
        intro: "RADIUS lets a switch or Wi‑Fi access point ask a central server whether a device may join. With 802.1X, the device proves who it is through EAP.",
        facts: [["Common use", "Work Wi‑Fi sign-in"], ["Pairs with", "802.1X and EAP"], ["Decides", "Accept or reject"]],
        phases: {
            Identify: ["who are you?", "The authenticator asks the device for an identity over EAPOL. The device answers, but the port stays closed until it is approved."],
            "Relay to backend": ["passes it to the server", "The authenticator wraps the EAP reply in a RADIUS Access-Request. The server answers with a challenge that starts the login method."],
            "Run EAP method": ["proves the identity", "Challenges and responses travel between device and server through the authenticator. The switch just relays; it never sees the secret."],
            Authorize: ["lets the device in", "The server sends Access-Accept, possibly with a VLAN or policy. The authenticator tells the device Success and opens its port."]
        }
    },
    captive: {
        intro: "Captive portals are the sign-in pages you see on hotel or café Wi‑Fi. The modern CAPPORT approach lets a device ask a portal API directly whether it is held back, instead of guessing from a broken web page.",
        facts: [["Standard", "CAPPORT API, RFC 8908"], ["Found via", "DHCP or router advertisement"], ["Answer", "JSON: captive true or false"]],
        phases: {
            "Discover API": ["learns where to ask", "Network setup hands the laptop the URL of the portal API. Now it has a trusted place to check its status."],
            "Read status": ["am I held back?", "The laptop queries the API over HTTPS. The reply says captive: true, so internet access is limited for now."],
            "Meet policy": ["accepts the terms", "The user opens the portal page and agrees to the terms. The gateway updates its policy to allow this device."],
            "Recheck access": ["confirms it is free", "The laptop asks the API again and gets captive: false. Ordinary internet traffic can now pass through the gateway."]
        }
    },
    smtp: {
        intro: "SMTP is how email is sent: your mail app hands a message to a submission server, which relays it toward the recipient’s server. The conversation is a series of short commands and numbered replies, protected here by TLS.",
        facts: [["Direction", "Sends mail; does not read it"], ["Envelope", "MAIL FROM and RCPT TO"], ["Reply style", "Three-digit codes like 250"]],
        phases: {
            Greet: ["says hello", "After TCP connects, the server greets with 220. The client says EHLO, and the server lists features such as STARTTLS."],
            "Secure submission": ["upgrades to TLS", "STARTTLS turns the plain connection into an encrypted one. The client then greets again because features may change once secure."],
            "Address envelope": ["who from, who to", "MAIL FROM and RCPT TO set the envelope, much like writing on the outside of a letter. Each is accepted with a 250 reply."],
            "Transfer content": ["sends the message", "DATA starts the message, the server replies 354, and the content follows. A final 250 means it has been queued for delivery."]
        }
    },
    pop3: {
        intro: "POP3 is a simple way for a mail app to download messages from a mailbox. It is designed around fetching mail to one device, often deleting it from the server afterwards, rather than keeping folders in sync.",
        facts: [["Commands", "STAT, LIST, RETR, QUIT"], ["Replies", "+OK or -ERR"], ["Best for", "One device downloading mail"]],
        phases: {
            "Enter transaction": ["logged in and ready", "After TLS and login, the session enters the transaction state. The mailbox is locked so another client cannot change it."],
            Inspect: ["what’s waiting?", "STAT reports how many messages and their total size. LIST shows each message number and its size."],
            Retrieve: ["downloads a message", "RETR 1 asks for the first message. The server sends the full text, ending with a single dot on its own line."],
            Quit: ["signs off", "QUIT ends the session. Any messages marked for deletion are removed now, then the mailbox lock is released."]
        }
    },
    imap: {
        intro: "IMAP lets mail apps work with messages that stay on the server, so phone and laptop see the same folders and read status. It can search and fetch just the parts you need, and even wait for new mail to arrive.",
        facts: [["Can do", "Search, partial fetch, IDLE"], ["Commands", "Tagged, like A1 SELECT INBOX"], ["Keeps", "Mail and flags on the server"]],
        phases: {
            "Select mailbox": ["opens a folder", "SELECT INBOX opens the folder. The server reports how many messages exist and other details the client needs."],
            "Find messages": ["searches on the server", "UID SEARCH asks the server to find matching messages. Only their IDs come back, so nothing large is downloaded yet."],
            "Fetch selectively": ["gets only what’s needed", "UID FETCH with BODY.PEEK pulls a chosen part without marking it read. The client can skip big attachments."],
            "Watch changes": ["waits for new mail", "IDLE keeps the connection open and the server sends EXISTS when mail arrives. DONE ends the wait so normal commands can resume."]
        }
    },
    ftp: {
        intro: "FTP transfers files using two connections: a control channel for commands and a separate data channel for the file itself. It is an older protocol, and without TLS its commands and passwords travel in plain text.",
        facts: [["Commands", "TYPE, EPSV, RETR"], ["Data channel", "Separate; passive mode common"], ["Security", "Plain text unless FTPS is used"]],
        phases: {
            "Control session": ["sets the transfer mode", "On the existing control connection, TYPE I asks for binary mode. The server replies 200, so the file will be copied byte for byte."],
            "Negotiate passive data": ["asks where to connect", "EPSV asks the server to open a data port. The 229 reply names the port, which works better through firewalls."],
            "Open data connection": ["builds the second link", "The laptop opens a fresh TCP connection to that data port. Commands still travel separately on the control channel."],
            Transfer: ["moves the file", "RETR requests the file, the server says 150 and sends the bytes over the data link. 226 confirms the transfer finished."]
        }
    },
    smb: {
        intro: "SMB is how Windows and many other systems share files and printers on a network. A client negotiates features, signs in, connects to a share and then opens, reads and closes files much like on a local drive.",
        facts: [["Common use", "Windows file shares"], ["Version", "SMB2 and SMB3"], ["Works with", "Shares, file handles, locks"]],
        phases: {
            Negotiate: ["agrees on a version", "The client lists the SMB dialects it supports and the server picks one. Security features like signing are agreed here too."],
            "Establish session": ["signs in", "SESSION_SETUP authenticates the user, often with Kerberos or NTLM. A session ID ties later requests to this login."],
            "Connect share": ["opens a shared folder", "TREE_CONNECT attaches to a share such as \\\\server\\docs. The server checks the user may access it."],
            "Read file": ["opens and reads", "CREATE opens a file read-only and returns a handle. READ uses that handle to pull bytes from the file."],
            "Close handle": ["lets the file go", "CLOSE releases the handle so the server can free locks and resources. The session can stay open for more work."]
        }
    },
    ssh: {
        intro: "SSH gives you a secure remote terminal and tunnels to another machine. It encrypts everything, verifies the server’s host key to stop impostors and then authenticates the user with a password or key.",
        facts: [["Common use", "Remote terminals and Git"], ["Server proof", "Host key checked against known_hosts"], ["User proof", "Public key or password"]],
        phases: {
            "Connect and identify": ["connects and says hello", "After the TCP handshake, both sides send a version line such as SSH-2.0. This confirms they speak the same protocol."],
            "Exchange keys": ["agrees secret keys", "Both sides swap key shares and the server signs the result with its host key. The client checks that key, then both switch to new keys."],
            "Authenticate user": ["proves who you are", "Inside the encrypted link the user proves their identity, usually with a key pair. USERAUTH_SUCCESS means access is granted."],
            "Open channel": ["starts a shell", "The client opens a channel for a terminal or command. Keystrokes and output now travel as encrypted channel data."]
        }
    },
    tls: {
        intro: "TLS is the security layer behind HTTPS and many other protocols. It agrees fresh encryption keys, proves the server’s identity with a certificate and then protects every record against reading or tampering.",
        facts: [["Version", "TLS 1.3"], ["Setup cost", "One round trip"], ["Proof", "Certificate plus signature"]],
        phases: {
            Negotiate: ["hello and key shares", "ClientHello offers versions, ciphers and a key share; ServerHello picks options and sends its own share. Both can now compute keys."],
            "Authenticate server": ["proves the server is real", "The server sends its certificate and a signature in an encrypted flight. The client checks the name, the chain and the signature."],
            "Finish client": ["confirms the handshake", "The client sends Finished, a check over everything exchanged. If anything was tampered with, this check fails."],
            "Protect records": ["encrypted data flows", "Application data now travels in encrypted records. Each record is sealed so changes in transit are detected."]
        }
    },
    "http-proxy": {
        intro: "An HTTP forward proxy sits between your device and the internet and makes connections for you. With CONNECT, it opens a raw tunnel so your HTTPS stays end-to-end encrypted while the proxy just passes bytes.",
        facts: [["Method", "HTTP CONNECT"], ["Common use", "Company web gateways"], ["Proxy sees", "Destination host, not page content"]],
        phases: {
            "Reach proxy": ["connects to the proxy", "The laptop opens a TCP connection to the proxy, not the website. All traffic will pass through this one hop."],
            "Request tunnel": ["asks for a tunnel", "CONNECT names the origin and port. The proxy opens its own connection there and replies 200 Connection Established."],
            "Authenticate origin": ["TLS straight to the site", "The TLS handshake passes through the tunnel to the real origin. The proxy relays it but cannot read or fake it."],
            "Use tunnel": ["encrypted traffic passes", "HTTPS requests and responses flow through the tunnel. The proxy only moves encrypted bytes back and forth."]
        }
    },
    socks5: {
        intro: "SOCKS5 is a general purpose proxy that relays almost any TCP or UDP traffic, not just web pages. The client tells the proxy where to connect, and the proxy forwards bytes without understanding them.",
        facts: [["Common use", "Relaying apps via one host"], ["Carries", "Any TCP stream; UDP optional"], ["Auth options", "None, username, or GSSAPI"]],
        phases: {
            "Connect proxy": ["connects to the proxy", "The laptop opens a TCP connection to the SOCKS proxy. This becomes the path for everything that follows."],
            "Negotiate method": ["picks how to sign in", "The client lists the login methods it supports and the proxy chooses one. In this demo it selects no authentication."],
            "Request destination": ["where should we go?", "CONNECT names the destination address and port. The proxy connects there and reports success back to the client."],
            "Relay bytes": ["passes data both ways", "The proxy now copies bytes between the two connections. This example is plain text, so the proxy could read it."]
        }
    },
    "reverse-proxy": {
        intro: "A reverse proxy is the front door to a website. Visitors talk to it, and it decides which backend server handles each request, adding TLS, caching, load balancing and protection along the way.",
        facts: [["Sits in front of", "One or more backend servers"], ["Handles", "TLS, routing, caching, limits"], ["Client sees", "Only the proxy’s address"]],
        phases: {
            "Receive at edge": ["the front door", "The visitor’s HTTPS request reaches the reverse proxy. TLS ends here, so the proxy can read the request."],
            "Select backend": ["picks who answers", "Rules based on host, path or load choose a backend. The visitor never needs to know which server was picked."],
            "Forward internally": ["passes it inside", "The proxy sends the request to the backend on the private network. The backend answers the proxy, not the visitor."],
            "Return through edge": ["answers the visitor", "The proxy wraps the response back into the visitor’s HTTPS connection. To the visitor, it all came from one site."]
        }
    },
    wireguard: {
        intro: "WireGuard is a lean, modern VPN that links devices with public keys, much like SSH. It encrypts IP packets into UDP datagrams and only accepts traffic from peers whose keys it already knows.",
        facts: [["Transport", "UDP, often port 51820"], ["Identity", "Public key per peer"], ["Routing", "AllowedIPs map traffic to peers"]],
        phases: {
            "Select peer": ["which tunnel to use?", "The client sees traffic for a private address. AllowedIPs says that range belongs to the VPN gateway, so it uses that peer."],
            "Authenticate handshake": ["proves both keys", "A one-round-trip handshake proves each side holds its private key. It creates fresh session keys that are rotated often."],
            "Encapsulate outbound": ["wraps the packet", "The original IP packet is encrypted inside a UDP datagram. The gateway decrypts it and forwards the inner packet to the service."],
            "Return through tunnel": ["reply comes back sealed", "The service answers, and the gateway encrypts the reply for the client. The client unwraps it as if it came from the local network."]
        }
    },
    ipsec: {
        intro: "IPsec secures traffic at the IP layer, often to link two office networks over the internet. IKE agrees keys and proves identities, then ESP encrypts each packet in a tunnel between the gateways.",
        facts: [["Key exchange", "IKEv2 on UDP 500 or 4500"], ["Data protection", "ESP tunnel mode"], ["Typical use", "Site-to-site VPN"]],
        phases: {
            "Negotiate IKE": ["agrees on settings", "IKE_SA_INIT swaps algorithm choices and key shares. The two gateways can now encrypt the rest of the conversation."],
            "Authenticate gateways": ["proves who they are", "IKE_AUTH proves each gateway’s identity and sets up the first tunnel. These messages are already encrypted."],
            "Protect outbound": ["encrypts the office traffic", "Gateway A wraps the inner packet in ESP and sends it across transit. Gateway B checks and decrypts it, then delivers it inside site B."],
            "Protect return": ["sealed on the way back", "The reply follows the same path in reverse with its own keys. Transit networks only see gateway addresses and encrypted data."]
        }
    },
    modbus: {
        intro: "Modbus is a simple industrial protocol for reading and writing values in devices like sensors and controllers. It has no built-in security, so real deployments keep it on isolated networks or wrap it in protection.",
        facts: [["Common use", "PLCs, meters and sensors"], ["Data model", "Coils and 16-bit registers"], ["Security", "None built in"]],
        phases: {
            Connect: ["opens a TCP connection", "The controller connects to the device on port 502. Modbus/TCP uses this stream for every request and reply."],
            "Request read": ["asks for a value", "Function code 03 asks to read holding registers starting at an address. A transaction ID links the request to its reply."],
            "Return register": ["sends the value back", "The device answers with the same transaction ID and the register contents. Each register holds a 16-bit number."],
            "Validate result": ["checks it makes sense", "The controller matches the ID, function and length before trusting the value. Mismatches are treated as errors, not data."]
        }
    }
};

const freeze = value => {
    if (value && typeof value === "object") Object.values(value).forEach(freeze);
    return Object.freeze(value);
};

export const lessonTeaching = freeze(lessons);
export const lessonPhaseTeaching = (lesson, phase) => lessonTeaching[lesson]?.phases[phase] || null;
