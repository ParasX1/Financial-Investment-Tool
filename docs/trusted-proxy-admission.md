# Market API admission behind proxies

Market API client identities use the TCP peer (`req.socket.remoteAddress`) by
default. Incoming `X-Forwarded-For` and `X-Real-IP` cannot change that identity.
IPv4, mapped IPv4 and equivalent IPv6 spellings use a canonical rate-limit key.
An absent or invalid peer shares the `unknown` bucket.

A deployment may set `MARKET_TRUSTED_PROXY_IPS` to a comma-separated list of exact
proxy IP addresses, for example `10.0.0.10,10.0.0.11`. No CIDRs, wildcard trust,
hostnames or automatic trust of private/loopback addresses are supported. The
default is empty. A malformed list, or more than 64 entries, disables header
trust. This is server configuration; do not use a `NEXT_PUBLIC_` variable.

`MARKET_TRUSTED_PROXY_HEADER` selects one verified header for those peers. Its
default is `x-forwarded-for`. Set it explicitly to `x-real-ip` only when the final
trusted proxy strips and overwrites XRealIP with a verified client identity.
Other selector values disable header trust. This choice is never inferred from
the presence, absence or validity of a request header; there is no automatic
fallback between the two headers. The exact peer allowlist remains required in
both modes.

Enable this only after checking the actual network path and proxy configuration:

- Each listed IP must identify a proxy under the deployment owner's control.
  Verify the TCP peer that Node receives; a header naming a proxy is insufficient.
- In XFF mode, every trusted proxy must append its verified incoming peer to `X-Forwarded-For`,
  or replace that header with a verified client address at the outer edge. It must
  never forward an unverified header without adding the actual peer.
- In XRealIP mode, the final trusted proxy must strip and overwrite any incoming
  value with a verified client identity. For multiple proxies, that identity must
  be resolved through the verified proxy chain rather than copied from an
  attacker-supplied header. Other forwarding headers are ignored in this mode.
- Direct application access must not let arbitrary clients appear as a listed
  proxy. Check listeners, firewall rules, container port exposure and network
  translation. Shared NAT or a sidecar that masks every caller as its own peer
  requires an ingress policy that prevents header passthrough.

In XFF mode, for a trusted immediate peer, XFF is validated as a complete chain, including
duplicate headers represented as arrays. Resolution walks from right to left
through explicitly trusted hops and uses the first untrusted hop. Any attacker
prefix further left is ignored. A malformed chain, more than 32 hops or more than
2,048 characters falls back to the TCP peer; it does not fall through to XRealIP.
If all hops are trusted, the leftmost hop is used. Missing XFF uses the peer.
In explicitly selected XRealIP mode, XRealIP must contain one valid IP; an absent
or malformed value uses the peer and never falls through to XFF.

Next.js 15.5.27 preserves supplied XFF and fills absent XFF from the socket before
the handler runs. Therefore an XRealIP-only deployment must explicitly select
XRealIP; checking whether XFF is absent cannot identify that deployment mode.
Running Next.js alone does not establish proxy trust. Pages API requests are Node
IncomingMessage instances, so the socket peer is the relevant local boundary.
See the [Next.js API route documentation](https://nextjs.org/docs/pages/building-your-application/routing/api-routes),
[Node socket documentation](https://nodejs.org/api/net.html#socketremoteaddress) and
[Node duplicate-header semantics](https://nodejs.org/api/http.html#messageheaders).

Legacy `/api/market/sparkline` and `/api/market/trending` accept GET only, validate
bounded inputs and admit work before contacting Yahoo. Sparkline shares chart
admission; trending reserves two provider requests for its official/fallback path.
Their shared provider fetch bounds headers plus decoded body completion to five
seconds and two MiB. Trending shares one five-second deadline across both calls.
Rejected and failed responses remain private with no storage. Successful anonymous
payloads, public cache durations and personalized trending cache behavior remain.

The limiter is in memory per Node process. Multiple replicas, process restarts and
CDN cache hits require deployment-specific consideration; these tests establish
application admission and provider bounds, not a distributed ingress quota.
