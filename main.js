#!/usr/bin/env node

const { spawnSync, spawn } = require("child_process")

console.log("Starting Wayland mapper...")

// Escape any special characters in string that might interfere with regexp composition
const escapeRegex = (string) => string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")

const getDevice = (eventSource, deviceName) => {
  if (process.env[eventSource]) {
    // If setting device by env var with "/dev/input/eventX"
    return process.env[eventSource]
  } else if (process.env[deviceName]) {
    // Else search for event number using RegEx and device name
    const escName = escapeRegex(process.env[deviceName])
    const r = new RegExp(`${escName}\\nKernel:\\s+(.+)`, "g")
    // Get the output of libinput list-devices
    const result = spawnSync("libinput", ["list-devices"])
    if (result.stderr.toString().length > 0) {
      console.error(result.stderr.toString())
      return null
    }
    const devices = result.stdout.toString()

    try {
      // Try to fetch the actual event source
      const dev = Array.from(devices.matchAll(r))[0][1].toString()
      return dev.split("/").slice(-1)[0]
    } catch {
      // bail out if it fails
      return null
    }
  }
  return null
}

const config = {
  mouse: getDevice("MAPPER_MOUSE", "MAPPER_MOUSE_NAME"), // Find these by running libinput list-devices
  keyboard: getDevice("MAPPER_KEYBOARD", "MAPPER_KEYBOARD_NAME"), // Find these by running libinput list-devices
  touchpad: getDevice("MAPPER_TOUCHPAD", "MAPPER_TOUCHPAD_NAME"), // Find these by running libinput list-devices
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
    // {
    //   type: "gesture", // Respond to a touchpad gesture
    //   sourceEvent: "3", // 3 fingers (valid values are 3 or 4)
    //   sourceType: "GESTURE_SWIPE_END", // This is the event that'sfired when a gesture is deemed over
    //   targetKeys: ["KEY_LEFTMETA"], // Keys to press in response
    // },
  ],
}

// Log the devices being used
console.log(`Mouse: ${config.mouse}`)
console.log(`Keyboard: ${config.keyboard}`)
console.log(`Touchpad: ${config.touchpad}`)

// Bail if not enough devices are set
if (config.keyboard == null || (config.mouse == null && config.touchpad == null)) {
  console.error(
    "Insufficient devices specified. Please set MAPPER_KEYBOARD or MAPPER_KEYBOARD_NAME and either MAPPER_MOUSE/MAPPER_MOUSE_NAME or MAPPER_TOUCHPAD/MAPPER_TOUCHPAD_NAME"
  )
  process.exit(1)
}

// A simple wrapper around the spawn command
const exec = (command, args) => {
  const result = spawn(command, args)
  result.stderr.on("data", (data) => console.error("ERROR: " + data.toString()))
  return result
}

const keyboard = `/dev/input/${config.keyboard}`

// Press a key combination
const pressKeys = (keys) => {
  // Firstly press all the keys...
  keys.map((key) => {
    exec("evemu-event", [keyboard, "--sync", "--type", "EV_KEY", "--code", key, "--value", 1])
  })
  // Then release them
  keys.map((key) => {
    exec("evemu-event", [keyboard, "--sync", "--type", "EV_KEY", "--code", key, "--value", 0])
  })
}

// Collect data from stdout about libinput events
const events = exec("stdbuf", ["-oL", "libinput", "debug-events"])

// Process the events...
events.stdout.on("data", (data) => {
  const output = data.toString()
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
