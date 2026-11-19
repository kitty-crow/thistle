# Reserved image range

`inputContains` checks that the image reservation lock is held and that a byte range falls inside the currently reserved input image. Both THX loading and VFS import use this check before reading source bytes. The function does not acquire or release the reservation.
