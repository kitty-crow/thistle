# sched

`Sched` provides the host kernel's cooperative scheduling boundary. Guest execution yields control rather than monopolising the host event loop; the calling process must still check its own pending signals. This module is distinct from the native hart scheduler.
