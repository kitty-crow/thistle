# net

`Net` validates HTTP(S) destinations and request limits, follows redirects within the configured limit, and tracks transferred bytes and failures. `Hdr`, `NReq` and `NRes` describe application headers, requests and responses. `DReq`, `DRes` and `NetDev` define the actual transport boundary; `MissingNetworkDevice` rejects requests when no transport exists. An abort signal and timeout cover the complete redirect chain.

`netRequest` constructs a complete request with the default method, timeout, redirect limit and empty headers and body.
