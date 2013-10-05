class Level
  constructor: (@file, @test) ->

  downlaod: ->
    dfd = $.ajax "/js/templates/#{@file}.txt"
    dfd.done (body) =>
      @source = body

levels = [
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

$ ->
  $.Deferred

  def = new $.Deferred()

  async.eachSeries levels, ((item, callback) ->
    d = item.downlaod()
    d.done ->
      callback null
    d.fail ->
      callback new Error 'Weird error'
  ), (err) ->
    return def.reject err if err
    def.resolve levels

  totalTime = 0 # In seconds

  $intro = $ '#intro'
  $game = $ '#game'
  $startButton = $intro.children 'button'
  $testCodeButton = $ '#test-code'

  playGame = ->
    level = levels.shift()
    editor.setValue level.source

    interval = setInterval (->
      totalTime += 1
      $game.find('.timer').html totalTime
    ), 1000

    $testCodeButton.click ->
      bin = CoffeeScript.compile editor.getValue(), bare: true
      fn = new Function 'test', 'expected', """
        #{bin}
        var ret = #{level.file}(test);
        if (ret !== expected) { throw new Error('Expected ' + expected); }
      """

      try
        level.test fn
        alert 'Good!'
      catch e
        alert 'Bad!'

  $startButton.click ->
    $startButton.remove()
    $intro.append $ '<div>Loading</div>'

    def.done (body) ->

      $intro.remove()
      $game.addClass 'visible'

      playGame()

  editor = ace.edit 'editor'
  editor.setTheme 'ace/theme/twilight'
  editor.getSession().setMode 'ace/mode/coffee'
