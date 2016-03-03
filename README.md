Ptt Crawler
===================
The ptt Crawler could get data from almost of the ptt's board like Gossiping.

----------
Installation
===================

    npm install pttCrawler

Start to crawler
===================

    var pttCrawler = require('pttCrawler');
    pttCrawler.crawler('Gossiping', 0, 1,function (result) {
      console.dir(result);
    });
Include the module and call the crawler method.
And ......
Surprise!!  There is not any steps, just keep waiting for a moment or read the progress in the terminal.

Function
===================

    Object.crawler(board, startFrom, pages, callback);

**board *{ String }***
BoardName.
You could look for BoardName from [here](https://www.ptt.cc/hotboard.html)
![example](http://i.imgur.com/O3vl8Ti.png)
Notice! The upper case and lowercase letter must be the same as the example in website above.
**startFrom *{ Int }***
The first page you want to start to crawler, you could look for the number from the board in browser urls line.
![example](http://i.imgur.com/ggXUeq4.png)
**pages *{ Int }***
Enter the number how many pages you want to crawler.
**callback *{ Function }***
Callback function, it would return a object.
License
===================
The pttCrawler is authorized to Academic use.
Copyright(c) 2016-2020 Bo-Wei Huang
National Dong Hwa University
MIT Licensed
