/* exported anim */

var anim =
// @EXPORT@
(function() {
  'use strict';

  var
    FUNC_KEYS = {
      'ease': [0.25, 0.1, 0.25, 1],
      'linear': [0, 0, 1, 1],
      'ease-in': [0.42, 0, 1, 1],
      'ease-out': [0, 0, 0.58, 1],
      'ease-in-out': [0.42, 0, 0.58, 1]
    },
    MSPF = 1000 / 60, // ms/frame (FPS: 60)

    requestAnim = window.requestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function(callback) { setTimeout(callback, MSPF); },

    cancelAnim = window.cancelAnimationFrame ||
      window.mozCancelAnimationFrame ||
      window.webkitCancelAnimationFrame ||
      window.msCancelAnimationFrame ||
      function(requestID) { clearTimeout(requestID); },

    /**
     * @callback frameCallback
     * @param {number} rate - Progress [0, 1].
     * @param {boolean} finish
     */

    /**
     * @typedef {Object} task
     * @property {number} animId
     * @property {frameCallback} callback - Callback that is called each frame.
     * @property {number} duration
     * @property {number} count - `0` as infinite.
     * @property {boolean} isLinear
     * @property {number[]} rates
     * @property {(number|null)} framesStart - The time when first frame ran, or `null` if it is not running.
     * @property {number} loopsLeft - A counter for loop.
     */

    /** @type {task[]} */
    tasks = [],
    newAnimId = -1,
    requestID;

  var running; // [DEBUG/]

  function step() {
    running = true; // [DEBUG/]
    var now = Date.now(), next = false;
    if (requestID) {
      cancelAnim.call(window, requestID);
      requestID = null;
    }

    tasks.forEach(function(task) {
      var timeLen, loops;

      if (!task.framesStart) { return; }
      timeLen = now - task.framesStart;

      if (timeLen >= task.duration && task.count && task.loopsLeft <= 1) {
        task.callback(1, true);
        task.framesStart = null;
        return;
      }
      if (timeLen > task.duration) {
        loops = Math.floor(timeLen / task.duration);
        if (task.count && loops >= task.loopsLeft) { // Here `task.loopsLeft > 1`
          task.callback(1, true);
          task.framesStart = null;
          return;
        }
        task.loopsLeft -= loops;
        task.framesStart += task.duration * loops;
        timeLen = now - task.framesStart;
      }

      if (task.callback(
          task.isLinear ? timeLen / task.duration : task.rates[Math.round(timeLen / MSPF)],
          false) !== false) {
        next = true;
      } else {
        task.framesStart = null;
      }
    });

    if (next) { requestID = requestAnim.call(window, step); }
  }

  // [DEBUG]
  setInterval(function() {
    document.body.style.backgroundColor = running ? '#f7f6cb' : '';
    running = false;
  }, 500);
  // [/DEBUG]

  function startTask(task) {
    task.framesStart = Date.now();
    task.loopsLeft = task.count;
    step();
  }

  window.tasks = tasks; // [DEBUG/]

  return {
    /**
     * @param {frameCallback} callback - task property
     * @param {number} duration - task property
     * @param {number} count - task property
     * @param {(string|number[])} timing - FUNC_KEYS or [x1, y1, x2, y2]
     * @returns {number} - animID to remove.
     */
    add: function(callback, duration, count, timing) {
      var animId = ++newAnimId, task, isLinear, rates,
        stepX, stepT, nextX, t, point;

      function getPoint(t) {
        var t2 = t * t, t3 = t2 * t, t1 = 1 - t, t12 = t1 * t1,
          p1f = 3 * t12 * t, p2f = 3 * t1 * t2;
        return {
          x: p1f * timing[0] + p2f * timing[2] + t3,
          y: p1f * timing[1] + p2f * timing[3] + t3
        };
      }

      if (typeof timing === 'string') { timing = FUNC_KEYS[timing]; }
      isLinear = timing[0] === 0 && timing[1] === 0 && timing[2] === 1 && timing[3] === 1;

      if (!isLinear) {
        // Generate list
        if (duration < MSPF) {
          rates = [0, 1];
        } else {
          stepX = MSPF / duration;
          stepT = stepX / 10; // precision
          nextX = stepX;
          rates = [0];
          for (t = stepT; t <= 1; t += stepT) {
            point = getPoint(t);
            if (point.x >= nextX) {
              rates.push(point.y);
              nextX += stepX;
            }
          }
          rates.push(1); // for tolerance
        }
      }

      task = {
        animId: animId,
        callback: callback, duration: duration, count: count, // task properties
        isLinear: isLinear,
        rates: rates
      };
      tasks.push(task);
      startTask(task);

      return animId;
    },

    remove: function(animId) {
      var iRemove;
      if (tasks.some(function(task, i) {
        if (task.animId === animId) {
          iRemove = i;
          task.framesStart = null; // for `tasks.forEach` that is running now.
          return true;
        }
        return false;
      })) {
        tasks.splice(iRemove, 1);
      }
    },

    start: function(animId) {
      tasks.some(function(task) {
        if (task.animId === animId) {
          startTask(task);
          return true;
        }
        return false;
      });
    },

    stop: function(animId) {
      tasks.some(function(task) {
        if (task.animId === animId) {
          task.framesStart = null;
          return true;
        }
        return false;
      });
    },

    validTiming: function(timing) {
      return typeof timing === 'string' ? FUNC_KEYS[timing] :
        Array.isArray(timing) && [0, 1, 2, 3].every(function(i) {
          return typeof timing[i] === 'number' && timing[i] >= 0 && timing[i] <= 1;
        }) ? [timing[0], timing[1], timing[2], timing[3]] :
        null;
    }
  };
})()
// @/EXPORT@
;