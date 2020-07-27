### Wayland Mouse Mapper

Maps mouse buttons and touchpad gestures to keyboard combinations. Check out the first few lines for configuration information. I wrote this mostly for personal use, I like mapping the side buttons on my mouse to GNOME's Overview Mode... I also like accessing the overview mode with touchpad gestures

This tool makes no promises about security/performance, but with the limited config shown in this repo, it seems to perform pretty well and doesn't consume any noticeable resources.

Some useful commands for understanding your setup are:

- `libinput list-devices`
- `stdbuf -oL libinput debug-events --show-keycodes`

### Requirements

- `libinput`
- `evemu`
- `node`

### Install as a service

Be sure to adjust the Environment directives in the systemd service file to match your particular setup!

```bash
$ sudo cp ./main.js /usr/local/bin/wayland-mapper.js
$ sudo useradd -r -M -s /sbin/nologin -g input mapper
$ sudo cp ./wayland-mapper.service /etc/systemd/system/wayland-mapper.service
$ sudo systemctl enable --now wayland-mapper
```
