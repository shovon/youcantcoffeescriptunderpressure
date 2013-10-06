class Level
  ### Represents a single level ###

  constructor: (@file, @_test) ->

  test: (fn) ->
    ###
    Runs the compiled CoffeeScript (defined by fn), against the test (specified
    by `this._test`)
    ###

    try
      @_test fn
      return true
    catch e
      return false

  downlaod: ->
    ###
    Makes an Ajax request for a given file. Once done, `this.file` will be
    given the value retrieved from the response.

    This is an asynchronous function, and hence, returns a Deferred object.
    ### 

    dfd = $.ajax "/js/templates/#{@file}.txt"
    dfd.done (body) =>
      @source = body

class Game
  constructor: ->
    @_totalTime = 0
    @_interval = null
    @_currentButton = null

    @_editor = ace.edit 'editor'
    @_editor.setTheme 'ace/theme/twilight'
    @_editor.getSession().setMode 'ace/mode/coffee'
    @_editor.getSession().setTabSize 2

    @_$game = $ '#game'
    @_$testCodeButton = $ '#test-code'
    @_$nextLevelButton =
      $ '<button class="major-btn btn btn-primary" type="button">Next</button>"'
    @_$nextLevelButton.click =>
      @_clearLog()
      @_$nextLevelButton.detach()
      @_$testCodeButton.prependTo $ '#game .toolbar'
      @playGame()
    @_$logs = $ '#logs'

    @_levels = [
      new Level 'doubleInteger', (fn) ->
        fn 10, 20
        fn 20, 40
        fn -10, -20
      new Level 'isNumberEven', (fn) ->
        fn 10, true
        fn 20, true
        fn 5, false
        fn 3, false
      new Level 'getFileExtension', (fn) ->
        fn 'something.js', 'js'
        fn 'picture.png', 'png'
    ]

    KeyboardJS.on 'command + enter', (->), =>
      if @_currentButton?
        @_currentButton.trigger 'click'

    $(window).bind 'keydown', ->

  _startTimer: ->
    @_interval = setInterval (=>
      @_totalTime += 1
      @_$game.find('.timer').html @_totalTime
    ), 1000

  _stopTimer: ->
    clearInterval @_interval
    @_interval = null

  _clearLog: ->
    @_$logs.html ''

  _log: (message, color='white') ->
    style = switch color
      when 'green' then 'background-color: green'
      when 'red' then 'background-color: red; color: white'
      else 'background-color: white'
    @_$logs.html @_$logs.html() + "<div style='#{style}'>#{message}</div.>"
    @_$logs.scrollTop @_$logs[0].scrollHeight

  download: ->
    def = new $.Deferred()

    # Initializes the levels
    async.eachSeries @_levels, ((item, callback) ->
      d = item.downlaod()
      d.done ->
        callback null
      d.fail ->
        callback new Error 'Weird error'
    ), (err) ->
      return def.reject err if err
      def.resolve @_levels

    return def

  playGame: ->
    level = @_levels.shift()

    return alert 'Done!' unless level

    @_editor.setValue level.source
    @_editor.selection.clearSelection()
    @_editor.focus()
    ((lines, lineCount, lastLine) =>
      lines = @_editor.session.getValue().split '\n'
      lineCount = lines.length
      lastLineLength = lines.pop().length

      @_editor.moveCursorToPosition row: lineCount, column: lastLineLength
    )()

    @_startTimer()

    @_currentButton = @_$testCodeButton
    @_$testCodeButton.click =>
      @_stopTimer()

      bin = CoffeeScript.compile @_editor.getValue(), bare: true

      # The function that will be running our test.
      f = new Function 'self', 'test', 'expected', """
        #{bin}
        self._log('Testing ' + '"#{level.file}(' + test + ');"');
        var ret = #{level.file}(test);
        if (ret !== expected) {
          self._log('WRONG: ' + test + ' is the wrong answer.', 'red');
          throw new Error('Expected ' + expected);
        }
        self._log('RIGHT: ' + test + ' is the right answer.', 'green');
      """

      fn = (a, b) =>
        f this, a, b

      if level.test fn
        @_$testCodeButton.detach()
        @_$nextLevelButton.prependTo $ '#game .toolbar'
        @_currentButton = @_$nextLevelButton
      else
        @_startTimer()

$ ->

  # Used for notifying when all the assets have finished downloading.
  game = new Game()
  def = game.download()

  totalTime = 0 # In seconds

  # All the DOM stuff.
  $intro = $ '#intro'
  $game = $ '#game'
  $startButton = $intro.children 'button'
  $logs = $ '#logs'

  $startButton.click ->
    $startButton.remove()

    $intro.append $ '<div>Loading</div>'

    def.done ->
      $intro.remove()
      $game.addClass 'visible'

      game.playGame()