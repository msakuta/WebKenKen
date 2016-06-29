WebKenKen
=========

[KenKen](https://en.wikipedia.org/wiki/KenKen) or KenDoku puzzle game with JavaScript only.

Puzzle sites that provide KenKen (including the [official site](http://www.kenkenpuzzle.com/game))
runs with annoying ads and requires Flash, which sucks.
Even the smartphone app versions require credential information, which shouldn't
be really necessary for such simple puzzle game.

So I decided to create a very lightweight clone of the game entirely written with JavaScript.

Try it now on your browser!

http://msakuta.github.io/WebKenKen/kenken.html


Features
--------

Here is a list of outstanding features compared to the official site and other reproductions on the web.

* It's very lightweight. You should be able to play with a smartphone.
* Entirely run on the browser, yet you can save the progress on the browser's local storage.
* Saved progress is only stored on the same browser, but you can copy a game state string
 to the clipboard and paste in another browser to continue on it.
* Does not use Flash player, which can make your browser super slow for no reason
 (I'm looking at you, official site).
* It can generate as many problems as you want with random number generator.
* Ensures the problem is really solvable before showing to the player.
* 'Memo' functionality enables you to assign answer candidates to each cell.
* Can change size of the board up to 9x9. Be aware that 9x9 can take some time to generate in slow computers.
