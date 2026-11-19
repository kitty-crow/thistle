# host fetch

`FetchDev` implements `NetDev` using the host's Fetch API. `hostNet` constructs the host network service. Requests cross the boundary to browser or server networking, so the host's CORS, connectivity and cancellation behaviour apply; guest code does not acquire direct network sockets.
