/* jshint node: true */
var request = require('request'),
  cheerio = require('cheerio'),
  j = request.jar(),
  request = request.defaults({jar:j}),
  debug = require("debug")("dev:crawler");

(function () {
  'use strict';
  var pttCrawler = {},
      mainUrlLists = [],
      resultContent = [],
      pttHost = 'https://www.ptt.cc',      // ptt address
      mainListCount = 0,                        // count that how many main page have crawler
      pageCount,                                // count how many page user want to crawler
      end;
  /**
   * get session from ptt, because some of ptt board have to check whether you have above 18 years old,
   * you have to get session or you would not be enter the board
   * @method establishSession
   * @param  {Function}       callback [description]
   * @return {[type]}                  [description]
   */
  function establishSession (callback) {
    request.post('https://www.ptt.cc/ask/over18',{
      form: {
        from: '/bbs/Gossiping/index.html',
        yes: 'yes'
      }
    }, function (err, res, body) {
    // after session set up, request board index (the first page you want to catch)
      debug('Session establish');
      if (err) {
        throw err;
      } else {
        // return a cookie-session and keep it until the crawler end
        return callback();
      }
    });
  }
  /**
   * createUrl which the user wants to start from
   * if user wants to start from the lastest mainPage,
   * the method would help to transform the url to index.html
   * @method createUrl
   * @param  {[type]}  board     [description]
   * @param  {[type]}  startFrom [description]
   * @return {[type]}            [description]
   */
  function createUrl ( board, startFrom) {
      if (startFrom === 0) {
        return pttHost + '/bbs/'+ board + '/index.html';
      } else {
        return pttHost + '/bbs/'+ board + '/index' + startFrom + '.html';
      }
  }
  /**
   * Recursive
   * start to get menu and push the url into mainUrlLists Array
   * when all mainPage are all scanned , start to crawler article one by one
   * @method getMenu
   * @param  {[String]} url [the mainPage url]
   * @return {[Function]}     [return to itself or start to requestArticle]
   */
  function getMenu ( url) {
  		request.get({
  			url: url,
  			headers: {
  				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.101 Safari/537.36'
  			}
  		}, function (err, res, body) {
  			if (err) {
  				debug(err + ', request again after 5 seconds!');
  				setTimeout(function(){
  					return getMenu(url);
  				}, 5000);
  			} else {
  				var $ = cheerio.load(res.body.toString());          // operation html dom with cheerio
  				$('div.r-ent a').each(function () {                 // get the URL from mainPage
  					var item = $(this).attr('href');
  					mainUrlLists.push(item);
            debug('Get ' + mainUrlLists.length + ' urls!');
  				});
  				var nextPage = $('a.wide:nth-child(2)').attr('href');
  				if (mainListCount != pageCount) {
            mainListCount +=1;                  // complete one page and continus to get nextPage URL
  					return getMenu(pttHost + nextPage);
  				} else {
  					return requestArticle();
  				}
  			}
  		});
    }
  /**
   * check the url which mainUrlLists have, and remove the firt one to getArticle
   * @method requestArticle
   * @return {Function}       [start to getArticle or end the program]
   */
  function requestArticle () {
    if ( mainUrlLists.length > 0) {
      var url = pttHost + mainUrlLists.shift();
      return getArticle(url);
    } else {
      return endCall();
    }
  }
  /**
   * Recursive
   * get the article from url, and push the data to resultContent
   * @method getArticle
   * @param  {url}   url [the url of the article]
   * @return {Function}       [call requestArticle to start crawler nextPage]
   */
  function getArticle (url) {
    request.get({
		url: url,
		headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.101 Safari/537.36'
		   }
	  }, function (err, res, body) {
      if (err) {
        debug(err + 'request the article again after 5 seconds');
        setTimeout(function(){
					return getArticle(url);
				}, 5000);
      } else {
        var $ = cheerio.load(body.toString()),
				    article = {
    					url: url,
    					author: $('div.article-metaline:nth-child(1) > span:nth-child(2)').text(),
    					title: checkTitle($),
    					publishedDate: getTime ($('div.article-metaline:nth-child(4) > span:nth-child(2)').text()),
    					board: $('.article-metaline-right > span:nth-child(2)').text(),
    					pictures: getPicture ($)
    					// content: getArticleMainContent ($)
  				    };
        resultContent.push(article);
        debug('Get' + article.title + 'in memory!');
        return requestArticle();
      }
    });
  }
  /**
   * When the requestArticle detected that the mainUrlLists is null, end the program and return the resultContent
   * @method endCall
   * @return {JSON} [result]
   */
  function endCall () {
    if (resultContent.length > 0) {
      return end(resultContent);
    } else {
      return end('Error! The board you choose were not supported or the board is empty! Please check the ptt Board directions.');
    }
  }
  /**
   * remove because of the main content didn't have it own tag, i have to delete other
   * it have to use after data had caught or you would caught nothing after using this
   * !!!important  it have to call on the end of crawler, after the method execute, the body would only remain the content but nothing.
   * @method getArticleMainContent
   * @param  {Object}              $ [DOM of the html]
   * @return {[String]}                [the content of the article]
   */
  function getArticleMainContent ($) {
  	$('#main-content').children().remove();
  	return $('#main-content').text().trim();
  }
  function getPicture($) {
  	var picturesUrls = [];
  	$('#main-content img').each(function () {
  		var $me = $(this),
  		    url = $me.attr('src');
  		picturesUrls.push(url);
  	});
  	return picturesUrls;
  }
  /**
   * checkTitle is whcih,
   * because sometimes the title would shift to the other children
   * @method checkTitle
   * @param  {Object}    $ [DOM of html]
   * @return {String}     [title text]
   */
  function checkTitle($) {
  	if ($('div.article-metaline:nth-child(3) > span:nth-child(1)').text()!= '標題') {
  		return $('div.article-metaline:nth-child(2) > span:nth-child(1)').text();
  	} else {
  		return $('div.article-metaline:nth-child(3) > span:nth-child(2)').text();
  	}
  }
  /**
   * convert time format
   * @method getTime
   * @param  {String} time [time text just get from article]
   * @return {String}      [time formatted]
   */
  function getTime(time) {
  	var tempD = new Date(time),
        hours;
  	if (!isNaN(tempD)) {
  		return tempD.getFullYear() +'-'+ getMonth(tempD) +'-'+ getDate(tempD) +' '+ getHour(tempD) +':'+tempD.getMinutes();
  	 } else {
  		return '0000-00-00';
  	}
  }
  /**
   * convert month to 2 digits
   * @method getMonth
   * @param  {Object} date [date object]
   * @return {String}      [month formatted]
   */
  function getMonth(date) {
  	var month = date.getMonth() + 1;
  	return month < 10 ? '0' + month : '' + month;
  }
  /**
   * convert date to 2 digits
   * @method getDate
   * @param  {Object} date [date object]
   * @return {String}      [date formatted]
   */
  function getDate(date) {
  		var dated = date.getDate();
  		return dated < 10 ? '0' + dated : '' + dated;
  }
  /**
   * convert Hour to 2 digits
   * @method getHour
   * @param  {Object} date [date object]
   * @return {String}      [hour formatted]
   */
  function getHour(date) {
  		var hour = date.getDate();
  		return hour < 10 ? '0' + hour : '' + hour;
  }
  pttCrawler.crawler = function (board, startFrom, page, callback) {
    pageCount = (page-1);      // because that the program would run without validtor at once.
    var url = createUrl(board, startFrom);
    establishSession(function () {
      getMenu(url);
    });
    end = callback;
  };
  // Node.js
  if (typeof module === 'object' && module.exports) {
      module.exports = pttCrawler;
  }
  // AMD / RequireJS
  else if (typeof define === 'function' && define.amd) {
      define([], function () {
          return pttCrawler;
      });
  }
  // included directly via <script> tag
  else {
      root.pttCrawler = pttCrawler;
  }
}());
