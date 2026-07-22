# Thistle TODO

<!-- sudo-post-exec-rv64-cleanup-fault -->
## Investigate sudo post-exec RV64 cleanup fault

**Status:** Potential kernel/runtime issue; not yet confirmed as a sudo defect.

### Reproduction

    sudo -n whoami

### Observed behaviour

The elevated command executes successfully and prints `root`.
Immediately afterward, the runtime exits with:

    sudo: ENOEXEC: bad RV64 instruction 0x00000000 at 0x31a004

### Current interpretation

Authentication, privilege escalation, exec, and the child command succeed.
The fault appears during child return, sudo cleanup, or process termination.

### Areas to investigate

- waitpid() and child-exit handling
- process teardown after exec
- signal delivery and signal-state restoration
- stack and register restoration
- return-address or function-pointer corruption
- RV64 instruction decoding around guest PC 0x31a004
- pseudo-terminal, file-descriptor, or process-group cleanup

### Notes

- sudo --version runs successfully.
- sudo -n whoami changes identity and runs whoami as root.
- The fault occurs only after root has already been printed.
- Create a smaller standalone C reproducer before final classification.
