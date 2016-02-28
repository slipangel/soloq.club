var express = require("express");
var https = require('https');
var app = express();
var util = require('util');
//FRO states
const COMPLETE = 0;
const FETCH_SUMMONER_ID = 1;
const FETCH_CURRENT_GAME = 2;
const FETCH_RECENT_MATCHES = 3;
const FETCH_TIMELINES = 4;
const FINISHED = 5;
const DONE = 6;
const INVALID_ID = -1;
//RIOT API KEY
var riotApiKey = '29b7f478-99c4-46af-b831-b5605e1b42af';
var testRegion = 'na';
var getSummonerIdURL = 'https://na.api.pvp.net/api/lol/na/v1.4/summoner/by-name/';
var getCurrentGameURL = 'https://na.api.pvp.net/observer-mode/rest/consumer/getSpectatorGameInfo/NA1/';
var getRecentMatches = 'https://na.api.pvp.net/api/lol/na/v1.3/game/by-summoner/';
var getMatchTimeLine = 'https://na.api.pvp.net/api/lol/na/v2.2/match/';
var froQueue = [];
var pickupMap = [];

// to get summoner id
// https://na.api.pvp.net/api/lol/{region}/v1.4/summoner/by-name/{summonerNames}?api_key=<key>
// full example
// timeline example
//https://na.api.pvp.net/api/lol/na/v2.2/match/2106980098?includeTimeline=true&api_key=29b7f478-99c4-46af-b831-b5605e1b42af

app.get("/",function(req,res){
  res.send("<h1>Test</h1>");
});

app.listen(3000, function(){
 setInterval(function(){
   QueueHandler();
 }, 1000);
});

function QueueHandler(){
  if(froQueue.length == 0) return; //nothing to work on

  switch(froQueue[0].state){
    case FETCH_SUMMONER_ID:
		console.log('should fetch summoner id: ' + JSON.stringify(froQueue[0]) + '\n\n');
		getSummonerId(froQueue[0]);
		break;
    case FETCH_CURRENT_GAME:
		console.log('should fetch current game for summoner id: ' + JSON.stringify(froQueue[0])+ '\n\n');
		getCurrentGameId(froQueue[0]);
		break;
	case FETCH_RECENT_MATCHES:
		console.log('should fetch recent matches for summoner id: ' + JSON.stringify(froQueue[0].summonerDataCurrentMatch) + '\n\n');
		getRecentGamesForSummoner(froQueue[0]);
		break;
	case FETCH_TIMELINES:
		//console.log('at fetch timelines, current fro ' + JSON.stringify(froQueue[0])+ '\n\n');
		getTimeline(froQueue[0]);
		break;
	case FINISHED:
		//remove fro from queue, add to id -> fro map
		console.log('finished');//+ JSON.stringify(froQueue[0])+ '\n\n');
		finalize(froQueue[0]);
	case DONE:
		console.log('done for reals');
		break;
  }
}


app.get("/summoner/:summoner",function(req,res){
  var FRO = {};
  FRO.summonerName = req.params.summoner;
  FRO.state = FETCH_SUMMONER_ID;
  froQueue.push(FRO);
});

app.get("/matchId/:match", function(req,res){
	
	//https://na.api.pvp.net/api/lol/na/v2.2/match/2106980098?includeTimeline=true&api_key=29b7f478-99c4-46af-b831-b5605e1b42af
	var reqString = '';
	reqString = getMatchTimeLine
		  + req.params.match
		  + '?includeTimeline=true&api_key='
		  + riotApiKey;
		var participantMap = {};
		var req2 = https.request(reqString, function(APIRes) {
			var JSONResponseString = '';
			//APIRes.setEncoding('utf-8');

			APIRes.on('data', function(data){
				JSONResponseString += data;
			});

			APIRes.on('end', function(){
			//console.log(JSONResponseString);
				var JSONResponseObject = JSON.parse(JSONResponseString);
				if(JSONResponseObject.status){
					//failure
					reportError(JSONResponseObject.status[Object.getOwnPropertyNames(JSONResponseObject.status)[1]]);
				} else {
					//success
					//matchObject.timeLine =
					var participantInformation = JSONResponseObject.participants;
					
					for(var i = 0; i < participantInformation.length; i++){
						var property = '' + participantInformation[i].participantId;
						participantMap[property] = { 'champId' : participantInformation[i].championId,
													  'teamId' : participantInformation[i].teamId,
													  'timeline' : {}};
					};
					
					var summonerTimelineData = new Array(10);
					var FrameList = JSONResponseObject.timeline.frames;
					for(var i = 0; i < FrameList.length; i++){
						var frame = FrameList[i];
						//console.log('on frame ' + i + ' frame info ' + JSON.stringify(FrameList[i].participantFrames) + ' \n');
						var time = Math.floor(frame.timestamp/60000);
						console.log('time: ' + time);
						for (var j = 1; j<11; j++) {
							//console.log('prop info' + JSON.stringify(FrameList[i].participantFrames[j].totalGold) + ' \n');
							//var timeProp = '' + time;
							participantMap[j].timeline[time] = {'gold' : FrameList[i].participantFrames[j].totalGold,
															  'xp'   : FrameList[i].participantFrames[j].xp};
                        }
					};
					console.log('\n');
					console.log(JSON.stringify(participantMap));
					res.setHeader('Content-Type', 'application/json');
				    res.setHeader('Cache-Control', 'no-cache');
					res.send(JSON.stringify(participantMap));
				}
			});
		});
		req2.end();
		

  });


function getSummonerId(theFRO){
  var reqString = '';
  reqString = getSummonerIdURL
		  + theFRO.summonerName
		  + '?api_key='
		  + riotApiKey;
  
  var req = https.request(reqString, function(APIRes) {
    var JSONResponseString = '';
    //APIRes.setEncoding('utf-8');

    APIRes.on('data', function(data){
      JSONResponseString += data;
    });

    APIRes.on('end', function(){
      //console.log(JSONResponseString);
      var JSONResponseObject = JSON.parse(JSONResponseString);
      if(JSONResponseObject.status){
		reportError(JSONResponseObject.status[Object.getOwnPropertyNames(JSONResponseObject.status)[1]]);
      } else {
        theFRO.summonerId = JSONResponseObject[Object.getOwnPropertyNames(JSONResponseObject)[0]].id;
		//console.log('summonerId: ' + theFRO.summonerId + ' being added to thefro');
        theFRO.state = FETCH_CURRENT_GAME;
      }      
    });
  });
  req.end();
}

function getCurrentGameId(theFRO) {
  var reqString = '';
  reqString = getCurrentGameURL
    	    + theFRO.summonerId
	        + '?api_key='
	        + riotApiKey;
  //console.log('getCurrentGameId() fro id val ' + theFRO.summonerId);
  
  var req = https.request(reqString, function(APIRes) {
    var JSONResponseString = '';
    var summonerDataForFRO = [];
    //APIRes.setEncoding('utf-8');

    APIRes.on('data', function(data){
      JSONResponseString += data;
    });

    APIRes.on('end', function(){
      //console.log(JSONResponseString);
      var JSONResponseObject = JSON.parse(JSONResponseString);
      if(JSONResponseObject.status){
		reportError(JSONResponseObject.status[Object.getOwnPropertyNames(JSONResponseObject.status)[1]]);
      } else {
        var participantArray = JSONResponseObject.participants;
		
        for(var i = 0; i < participantArray.length; i++){
	    //console.log('Summoner: ' + participantArray[i].summonerName + ' Id: ' + participantArray[i].summonerName );
			var summonerData = { SummonerName : participantArray[i].summonerName,
								SummonerId : participantArray[i].summonerId,
								ChampId : participantArray[i].championId,
								teamId : participantArray[i].teamId,
								timelines : []};
							 
			summonerDataForFRO[i] = summonerData;
		}
		theFRO.summonerDataCurrentMatch = summonerDataForFRO;
		//console.log('summonerId: ' + JSON.stringify(summonerDataForFRO) + ' being added to thefro');
        theFRO.state = FETCH_RECENT_MATCHES;
      }      
    });
  });
  req.end();  
}

function getRecentGamesForSummoner(theFRO){
		
	var summonerDataCurrentMatch = theFRO.summonerDataCurrentMatch;
	var summonerData = {};
	var changeState = true;
	for(var i = 0; i<summonerDataCurrentMatch.length; i++){
		if(!summonerDataCurrentMatch[i].recentMatchLoadComplete){
			summonerData = summonerDataCurrentMatch[i];
			changeState = false;
			break;
		}
	}
	
	if (changeState) {
        theFRO.state = FETCH_TIMELINES;
		theFRO.summonerForTimeline = 0;
		return;
    }
	  
	var reqString = '';
	reqString = getRecentMatches
				+ summonerData.SummonerId
				+ '/recent?api_key='
				+ riotApiKey;
	
	var req = https.request(reqString, function(APIRes) {
		var JSONResponseString = '';
		APIRes.setEncoding('utf-8');
	
		APIRes.on('data', function(data){
			JSONResponseString += data;
		});
	
		APIRes.on('end', function(){
			var JSONResponseObject = JSON.parse(JSONResponseString);
			if (JSONResponseObject.status){
				reportError(JSONResponseObject.status[Object.getOwnPropertyNames(JSONResponseObject.status)[1]]);
			} else {
				//console.log('recieved data: ' + JSONResponseString + '\n\n');
				var recentMatchList = JSONResponseObject.games;
				var recentMatchesWithCurrentChamp = [];
				for(var i = 0; i < recentMatchList.length; i++){
				//console.log('\n\nPlayer: ' + summonerData.SummonerName +' current champ Id: ' + summonerData.ChampId + ' history champ id: ' + recentMatchList[i].championId + '\n\n');
					if(recentMatchList[i].championId == summonerData.ChampId){
						//console.log('\n\nMatch found!!! id: '+ recentMatchList[i].gameId + '\n\n');
						recentMatchesWithCurrentChamp.push({matchId : recentMatchList[i].gameId});
					}
				}
				summonerData.recentMatches = recentMatchesWithCurrentChamp;
				summonerData.recentMatchLoadComplete = true;
			}
		});
	});
	req.end();
}

function getTimeline(theFRO) {
	
	//find summoner data we are working with
	var findingMatches = true;
	var matchesToFetch;
	var participantMap = {};
	
	while (findingMatches) {
		if (theFRO.summonerForTimeline > 9) {
			//We're done!
			theFRO.state = FINISHED;
			return;
		}
		matchesToFetch = theFRO.summonerDataCurrentMatch[theFRO.summonerForTimeline].recentMatches;
		if (matchesToFetch.length == 0) {
            //no matches to find, check next summoner
			theFRO.summonerForTimeline++;
        } else {
			//we found a summoner with matches
			//
			findingMatches = false;
		}
	}
    
	console.log('Getting matches for summoner: ' + theFRO.summonerForTimeline
				+ ' Total matches ' + matchesToFetch.length + '\n');
	var champId = theFRO.summonerDataCurrentMatch[theFRO.summonerForTimeline].ChampId;
	var matchObject;
	var continueToNextSummoner = true;
	for(var i = 0; i < matchesToFetch.length; i++){
		if (!matchesToFetch[i].timeLine && !matchesToFetch[i].startedTimeLineRetrieval) {
            //we found a match without a timeline
			console.log('fetching match: ' + i + '\n');
			matchObject = matchesToFetch[i];
			//flag start of timeline download
			matchObject.startedTimeLineRetrieval = true;
			continueToNextSummoner = false;
			break;
        }
	}
	
	if(continueToNextSummoner){
		theFRO.summonerForTimeline++;
		return;
	}
	
	//https://na.api.pvp.net/api/lol/na/v2.2/match/2106980098?includeTimeline=true&api_key=29b7f478-99c4-46af-b831-b5605e1b42af
	var reqString = '';
	reqString = getMatchTimeLine
		  + matchObject.matchId
		  + '?includeTimeline=true&api_key='
		  + riotApiKey;
	
		var req = https.request(reqString, function(APIRes) {
		var JSONResponseString = '';
		//APIRes.setEncoding('utf-8');

		APIRes.on('data', function(data){
			JSONResponseString += data;
		});

		APIRes.on('end', function(){
		//console.log(JSONResponseString);
		var JSONResponseObject = JSON.parse(JSONResponseString);
		if(JSONResponseObject.status){
			//failure
			reportError(JSONResponseObject.status[Object.getOwnPropertyNames(JSONResponseObject.status)[1]]);
		} else {
			var participantInformation = JSONResponseObject.participants;
					
			for(var i = 0; i < participantInformation.length; i++){
				var property = '' + participantInformation[i].participantId;
				participantMap[property] = { 'champId' : participantInformation[i].championId,
											 'teamId' : participantInformation[i].teamId,
											 'timeline' : []};
											 
				if (participantInformation[i].championId == champId) {
                    participantMap[property].isCurrentSummoner = true;
				} else {
					participantMap[property].isCurrentSummoner = false;
				}
			}
					
			var summonerTimelineData = new Array(10);
			var FrameList = JSONResponseObject.timeline.frames;
			for(var i = 0; i < FrameList.length; i++){
				var frame = FrameList[i];
				//console.log('on frame ' + i + ' frame info ' + JSON.stringify(FrameList[i].participantFrames) + ' \n');
				var time = Math.floor(frame.timestamp/60000);
				//console.log('time: ' + time);
				for (var j = 1; j<11; j++) {
					//console.log('prop info' + JSON.stringify(FrameList[i].participantFrames[j].totalGold) + ' \n');
					//var timeProp = '' + time;
					participantMap[j].timeline[time] = {'gold' : FrameList[i].participantFrames[j].totalGold,
														'xp'   : FrameList[i].participantFrames[j].xp};
                    }
				};
				
			//console.log('\n');
			//console.log(JSON.stringify(participantMap));
			matchObject.timeline = participantMap;
		}		
    });
  });
  req.end();
}

function finalize(theFRO) {
    var summonerDataCurrentMatch = theFRO.summonerDataCurrentMatch;
	
	for(var i = 0; i<summonerDataCurrentMatch.length; i++){
		//For each summoner
		var finalTimeline = [];
		var summoner = summonerDataCurrentMatch[i];
		var matchHistory = summoner.recentMatches;
		//console.log('match history length: ' + JSON.stringify(summoner.recentMatches));
		//discard unecessary timeline info
		//console.log('match history length: ' + matchHistory.length);
		for(var j = 0; j<matchHistory.length; j++){
			//for each match played
			//console.log('iteration: ' + j);
			var timeline = {};
			if (matchHistory[j].timeline) {
                participantMap = matchHistory[j].timeline;
            } else {
				console.log('no timeline was found for match id: ' + matchHistory[j].matchId);
				continue;
			}
			//console.log('\n\n' + JSON.stringify(participantMap) + '\n\n');
			for (var n = 1; n<11; n++) {
				//console.log('\n\n' + JSON.stringify(participantMap[n]) + '\n\n');
                if(participantMap[n].isCurrentSummoner){
					timeline = participantMap[n].timeline;
					break;
				}
            }
			console.log('\n\n' + JSON.stringify(timeline) + '\n\n');
			for(var minute = 0; minute<timeline.length; minute++){
				if (!finalTimeline[minute]) {
					//if no timeline entry exists for a given minute in our final timeline, create a new one
					finalTimeline[minute] = timeline[minute];
					finalTimeline[minute].numberOfEntries = 1;	
				} else {
				//else add the values at j, increment number of entries
					finalTimeline[minute].gold += timeline[minute].gold;
					finalTimeline[minute].xp += timeline[minute].xp;
					finalTimeline[minute].numberOfEntries++;
				}
			}
		}
		//average timeline values
		//console.log('Final timeline pre avg \n\n' + JSON.stringify(finalTimeline) + '\n\n');
		for(var minute = 0; minute<finalTimeline.length; minute++){
			finalTimeline[minute].gold = Math.floor(finalTimeline[minute].gold/finalTimeline[minute].numberOfEntries);
			finalTimeline[minute].xp = Math.floor(finalTimeline[minute].xp/finalTimeline[minute].numberOfEntries);
		}
		//console.log('Final timeline post avg \n\n' + JSON.stringify(finalTimeline) + '\n\n');
		summoner.timeline = finalTimeline;
		summoner.recentMatches = {};
	}
	console.log(JSON.stringify(theFRO));
	theFRO.state = DONE;
}

function reportError(error) {
    switch(error){
	  case 404:
	    console.log('error: ' + error + '\n\n');
	    break;
      case 429:
	    console.log('error: ' + error + '\n\n');
        break;
      default:
        console.log('strange error: ' + error + '\n\n');
	}
}