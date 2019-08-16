#!/usr/bin/env node

const { spawn } = require("child_process")

console.log("Starting Wayland mapper...")

const config = {
  mouse: "event19",
  keyboard: "event4",
  touchpad: "event18",
  mappings: [
    {
      type: "mouseButton",
      sourceEvent: "BTN_EXTRA",
      targetKeys: ["KEY_LEFTMETA"],
    },
    {
      type: "mouseButton",
      sourceEvent: "BTN_SIDE",
      targetKeys: ["KEY_LEFTALT", "KEY_LEFT"],
    },
    {
      type: "gesture",
      sourceEvent: "3",
      sourceType: "GESTURE_SWIPE_END",
      targetKeys: ["KEY_LEFTMETA"],
      endEvent: "",
    },
  ],
}

const keyboard = `/dev/input/${config.keyboard}`

const exec = command => {
  const result = spawn(command, [], { shell: true })
  result.stderr.on("data", data => console.error("ERROR: " + data.toString()))
  return result
}

const events = exec(`stdbuf -oL libinput debug-events`)

const pressKeys = keys => {
  keys.map(key => {
    exec(`evemu-event ${keyboard} --sync --type EV_KEY --code ${key} --value 1`)
  })
  keys.map(key => {
    exec(`evemu-event ${keyboard} --sync --type EV_KEY --code ${key} --value 0`)
  })
}

events.stdout.on("data", data => {
  const output = data.toString()
  // console.log(output)
  config.mappings.map(({ type, ...args }) => {
    if (type === "mouseButton") {
      const isPointerButton = output.includes("POINTER_BUTTON")
      const isMappedButton = output.includes(args.sourceEvent)
      const isReleased = output.includes("released")
      if (isPointerButton && isMappedButton && isReleased) {
        pressKeys(args.targetKeys)
      }
    } else if (type === "gesture") {
      const isGesture = output.includes("GESTURE_SWIPE_END")
      const isMappedButton = output.includes(args.sourceEvent)
      if (isGesture && isMappedButton) {
        pressKeys(args.targetKeys)
      }
    }
  })
})
