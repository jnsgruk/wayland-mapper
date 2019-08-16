### Wayland Mouse Mapper

Maps mouse buttons and gestures to keyboard combinations. Check out the first few lines for configuration information.

Some useful commands for understanding your setup are:

- `libinput list-devices`
- `stdbuf -oL libinput debug-events --show-keycodes`

### Requirements

- `libinput`
- `evemu`
- `node`

### Install

```bash
$ sudo cp ./main.js /usr/local/bin/wayland-mapper.js
$ sudo useradd -M -s /sbin/nologin -g input mapper
$ sudo cp ./wayland-mapper.service /etc/systemd/system/wayland-mapper.service
$ sudo systemctl enable --now wayland-mapper
$ journalctl -fu wayland-mapper #check the bad boy is running...
```
