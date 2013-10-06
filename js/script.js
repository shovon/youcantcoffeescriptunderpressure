var Game, Level, splitTime, toHumanReadable, tommss;

Level = (function() {
  /* Represents a single level*/

  function Level(file, _test) {
    this.file = file;
    this._test = _test;
  }

  Level.prototype.test = function(fn) {
    /*
    Runs the compiled CoffeeScript (defined by fn), against the test (specified
    by `this._test`)
    */

    var e;
    try {
      this._test(fn);
      return true;
    } catch (_error) {
      e = _error;
      return false;
    }
  };

  Level.prototype.downlaod = function() {
    /*
    Makes an Ajax request for a given file. Once done, `this.file` will be
    given the value retrieved from the response.
    
    This is an asynchronous function, and hence, returns a Deferred object.
    */

    var dfd,
      _this = this;
    dfd = $.ajax("/js/templates/" + this.file + ".txt");
    return dfd.done(function(body) {
      return _this.source = body;
    });
  };

  return Level;

})();

splitTime = function(seconds) {
  var minutes;
  minutes = Math.floor(seconds / 60);
  return {
    minutes: minutes,
    seconds: seconds - minutes * 60
  };
};

tommss = function(seconds) {
  var minutes, _ref;
  _ref = splitTime(seconds), minutes = _ref.minutes, seconds = _ref.seconds;
  minutes = minutes < 10 ? "0" + minutes : minutes.toString();
  seconds = seconds < 10 ? "0" + seconds : seconds.toString();
  return "" + minutes + ":" + seconds;
};

toHumanReadable = function(seconds) {
  var minutes, _ref;
  _ref = splitTime(seconds), minutes = _ref.minutes, seconds = _ref.seconds;
  if (minutes > 1) {
    minutes = "" + minutes + " minutes";
  } else if (minutes === 1) {
    minutes = "" + minutes + " minute";
  } else {
    minutes = "";
  }
  if (seconds > 1) {
    seconds = "" + seconds + " seconds";
  } else if (seconds === 1) {
    seconds = "" + seconds + " second";
  } else {
    seconds = "";
  }
  if (minutes && seconds) {
    return [minutes, seconds].join(' and ');
  } else if (minutes || seconds) {
    return minutes || seconds;
  } else {
    return 'no time';
  }
};

Game = (function() {
  function Game() {
    var _this = this;
    this._totalTime = 0;
    this._interval = null;
    this._currentButton = null;
    this._editor = ace.edit('editor');
    this._editor.setTheme('ace/theme/twilight');
    this._editor.getSession().setMode('ace/mode/coffee');
    this._editor.getSession().setTabSize(2);
    this._$game = $('#game');
    this._$testCodeButton = $('#test-code');
    this._$nextLevelButton = $('<button class="major-btn btn btn-primary" type="button">Next</button>"');
    this._$nextLevelButton.click(function() {
      _this._clearLog();
      _this._$nextLevelButton.detach();
      _this._$testCodeButton.prependTo($('#game .toolbar'));
      return _this.playGame();
    });
    this._$logs = $('#logs');
    this._$outro = $('#outro');
    this._levels = [
      new Level('doubleInteger', function(fn) {
        fn(10, 20);
        fn(20, 40);
        return fn(-10, -20);
      })
    ];
    new Level('isNumberEven', function(fn) {
      fn(10, true);
      fn(20, true);
      fn(5, false);
      return fn(3, false);
    });
    new Level('getFileExtension', function(fn) {
      fn('something.js', 'js');
      return fn('picture.png', 'png');
    });
    KeyboardJS.on('command + enter', (function() {}), function() {
      if (_this._currentButton != null) {
        return _this._currentButton.trigger('click');
      }
    });
    $(window).bind('keydown', function() {});
  }

  Game.prototype._tweetProgress = function() {
    var tweetUrl;
    tweetUrl = "https://twitter.com/intent/tweet?related=shovnr&text=";
    tweetUrl += encodeURIComponent("I finished \"You can't CoffeeScript Under Pressure\" in " + ("" + (toHumanReadable(this._totalTime)) + ". You think you can do better?"));
    tweetUrl += "&url=" + window.location.href;
    return window.open(tweetUrl, '_blank');
  };

  Game.prototype._startTimer = function() {
    var _this = this;
    return this._interval = setInterval((function() {
      _this._totalTime += 1;
      return _this._$game.find('.timer').html(tommss(_this._totalTime));
    }), 1000);
  };

  Game.prototype._stopTimer = function() {
    clearInterval(this._interval);
    return this._interval = null;
  };

  Game.prototype._clearLog = function() {
    return this._$logs.html('');
  };

  Game.prototype._log = function(message, color) {
    var style;
    if (color == null) {
      color = 'white';
    }
    style = (function() {
      switch (color) {
        case 'green':
          return 'background-color: green';
        case 'red':
          return 'background-color: red; color: white';
        default:
          return 'background-color: white';
      }
    })();
    this._$logs.html(this._$logs.html() + ("<div style='" + style + "'>" + message + "</div.>"));
    return this._$logs.scrollTop(this._$logs[0].scrollHeight);
  };

  Game.prototype.download = function() {
    var def;
    def = new $.Deferred();
    async.eachSeries(this._levels, (function(item, callback) {
      var d;
      d = item.downlaod();
      d.done(function() {
        return callback(null);
      });
      return d.fail(function() {
        return callback(new Error('Weird error'));
      });
    }), function(err) {
      if (err) {
        return def.reject(err);
      }
      return def.resolve(this._levels);
    });
    return def;
  };

  Game.prototype._closeGame = function() {
    var _this = this;
    this._$game.remove();
    this._$outro.addClass('visible');
    this._$outro.find('h1').html("You finished in " + (toHumanReadable(this._totalTime)));
    return $('#tweet-progress').click(function() {
      return _this._tweetProgress();
    });
  };

  Game.prototype.playGame = function() {
    var level,
      _this = this;
    level = this._levels.shift();
    if (!level) {
      return this._closeGame();
    }
    this._editor.setValue(level.source);
    this._editor.selection.clearSelection();
    this._editor.focus();
    (function(lines, lineCount, lastLine) {
      var lastLineLength;
      lines = _this._editor.session.getValue().split('\n');
      lineCount = lines.length;
      lastLineLength = lines.pop().length;
      return _this._editor.moveCursorToPosition({
        row: lineCount,
        column: lastLineLength
      });
    })();
    this._startTimer();
    this._currentButton = this._$testCodeButton;
    return this._$testCodeButton.click(function() {
      var bin, f, fn;
      _this._stopTimer();
      bin = CoffeeScript.compile(_this._editor.getValue(), {
        bare: true
      });
      f = new Function('self', 'test', 'expected', "" + bin + "\nself._log('Testing ' + '\"" + level.file + "(' + test + ');\"');\ntry {\n  var ret = " + level.file + "(test);\n  if (ret !== expected) {\n    throw new Error('WRONG: ' + test + ' is the wrong answer.');\n  }\n  self._log('RIGHT: ' + test + ' is the right answer.', 'green');\n} catch (e) {\n  self._log(e.message, 'red');\n  throw new e;\n}");
      fn = function(a, b) {
        return f(_this, a, b);
      };
      if (level.test(fn)) {
        _this._$testCodeButton.detach();
        _this._$nextLevelButton.prependTo($('#game .toolbar'));
        return _this._currentButton = _this._$nextLevelButton;
      } else {
        return _this._startTimer();
      }
    });
  };

  return Game;

})();

$(function() {
  var $game, $intro, $logs, $startButton, def, game, totalTime;
  game = new Game();
  def = game.download();
  totalTime = 0;
  $intro = $('#intro');
  $game = $('#game');
  $startButton = $intro.children('button');
  $logs = $('#logs');
  return $startButton.click(function() {
    $startButton.remove();
    $intro.append($('<div>Loading</div>'));
    return def.done(function() {
      $intro.remove();
      $game.addClass('visible');
      return game.playGame();
    });
  });
});
