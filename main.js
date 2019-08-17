#!/usr/bin/env node

const { spawn } = require("child_process")

console.log("Starting Wayland mapper...")

const config = {
  mouse: "event19", // Find these by running libinput list-devices
  keyboard: "event4", // Find these by running libinput list-devices
  touchpad: "event18", // Find these by running libinput list-devices
  mappings: [
    {
      type: "mouseButton", // Type of event to respond to
      sourceEvent: "BTN_EXTRA", // In my case, this is the forward-most side button on my mouse
      targetKeys: ["KEY_LEFTMETA"], // Keys to press in response
    },
    {
      type: "mouseButton",
      sourceEvent: "BTN_SIDE", // In my case, this is the rear-most side button on my mouse
      targetKeys: ["KEY_LEFTALT", "KEY_LEFT"], // Keys to press in response
    },
    {
      type: "gesture", // Respond to a touchpad gesture
      sourceEvent: "3", // 3 fingers (valid values are 3 or 4)
      sourceType: "GESTURE_SWIPE_END", // This is the event that'sfired when a gesture is deemed over
      targetKeys: ["KEY_LEFTMETA"], // Keys to press in response
    },
  ],
}

const keyboard = `/dev/input/${config.keyboard}`

// A simple wrapper around the spawn command
const exec = (command, args) => {
  const result = spawn(command, args)
  result.stderr.on("data", data => console.error("ERROR: " + data.toString()))
  return result
}

// Press a key combination
const pressKeys = keys => {
  // Firstly press all the keys...
  keys.map(key => {
    exec("evemu-event", [
      keyboard,
      "--sync",
      "--type",
      "EV_KEY",
      "--code",
      key,
      "--value",
      1,
    ])
  })
  // Then release them
  keys.map(key => {
    exec("evemu-event", [
      keyboard,
      "--sync",
      "--type",
      "EV_KEY",
      "--code",
      key,
      "--value",
      0,
    ])
  })
}

// Collect data from stdout about libinput events
const events = exec("stdbuf", ["-oL", "libinput", "debug-events"])

// Process the events...
events.stdout.on("data", data => {
  const output = data.toString()
  // console.log(output)
  config.mappings.map(({ type, ...args }) => {
    // for each event, check all of the mappings...
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
