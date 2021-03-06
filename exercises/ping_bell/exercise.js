var proxyquire = require('proxyquire')
var five = require('../../stubs/five')
var expect = require('chai').expect
var dgram = require('dgram')

var exercise      = require('workshopper-exercise')(),
  filecheck       = require('workshopper-exercise/filecheck'),
  execute         = require('workshopper-exercise/execute'),
  wrappedexec     = require('workshopper-wrappedexec'),
  path            = require('path')

// checks that the submission file actually exists
exercise = filecheck(exercise)

// execute the solution and submission in parallel with spawn()
exercise = execute(exercise)

// wrap up the child process in a phantom wrapper that can
// mess with the global environment and inspect execution
exercise = wrappedexec(exercise)

// this actually runs the solution
exercise.addProcessor(function (mode, callback) {
  // includes the solution to run it
  proxyquire(path.join(process.cwd(), exercise.args[0]), {'johnny-five': five.spyOn('Piezo')})

  setTimeout(function() {
    console.log('Please wait while your solution is tested...')
  }, 1000)

  // need a better way of detecting when we are done..
  setTimeout(function() {
    callback(null)
  }, 2000)
})

// add a processor only for 'verify' calls
exercise.addVerifyProcessor(function (callback) {
  try {
    var io = five.stubs.firmata.singleton

    if (!io) {
      // yikes, board was never created
      return callback(null, false)
    }

    var piezo = five.Piezo.instances[0]

    expect(piezo, 'no Piezo instance created').to.exist
    expect(piezo.pin, 'piezo expected to be connected to pin 8').to.equal(8)

    var initial = {
      tone: {callCount: piezo.tone.callCount}
    }

    var buffer = new Buffer('HAI!?')

    dgram.createSocket('udp4').send(buffer, 0, buffer.length, 1337)

    // Allow some time for the udp packet to reach server and sound to be played
    setTimeout(function () {
      try {
        expect(
          piezo.tone.callCount,
          'Piezo didn\'t play a tone when sent a UDP message')
            .to.be.gt(initial.tone.callCount)

        callback(null, true)
      } catch (er) {
        callback(er, false)
      }
    }, 500)

  } catch (e) {
    callback(e, false)
  }
})

module.exports = exercise
