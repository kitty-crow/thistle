# start

`thistleBuildInitialStack` builds the RV64 process startup stack from a supplied image of arguments, environment and auxiliary-vector information. It validates the image and writes stack data through the native kernel memory interface; return codes identify malformed input or insufficient guest memory.
