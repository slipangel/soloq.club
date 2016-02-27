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
const INVALID_ID = -1;
//RIOT API KEY
var riotApiKey = '29b7f478-99c4-46af-b831-b5605e1b42af';
var testRegion = 'na';
var getSummonerIdURL = 'https://na.api.pvp.net/api/lol/na/v1.4/summoner/by-name/';
var getCurrentGameURL = 'https://na.api.pvp.net/observer-mode/rest/consumer/getSpectatorGameInfo/NA1/';
var getRecentMatches = 'https://na.api.pvp.net/api/lol/na/v1.3/game/by-summoner/';
var getMatchTimeLine = 'https://na.api.pvp.net/api/lol/na/v2.2/match/';
var froQueue = [];

// to get summoner id
// https://na.api.pvp.net/api/lol/{region}/v1.4/summoner/by-name/{summonerNames}?api_key=<key>
// full example
// timeline example
//https://na.api.pvp.net/api/lol/na/v2.2/match/2106980098?includeTimeline=true&api_key=29b7f478-99c4-46af-b831-b5605e1b42af

app.get("/test",function(req,res){
	testVar++;
	res.send("counter = " + testVar);       
});

app.get("/",function(req,res){
  res.send("<h1>Test</h1>");
});

app.listen(80, function(){
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
		console.log('at fetch timelines, current fro ' + JSON.stringify(froQueue[0])+ '\n\n');
		getTimeline(froQueue[0]);
		break;
  }
}


app.get("/summoner/:summoner",function(req,res){
  var FRO = {};
  FRO.summonerName = req.params.summoner;
  FRO.state = FETCH_SUMMONER_ID;
  froQueue.push(FRO);
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
							 teamId : participantArray[i].teamId };
							 
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
				summonerData.recentMatchesWithCurrentChamp = recentMatchesWithCurrentChamp;
				summonerData.recentMatchLoadComplete = true;
			}
		});
	});
req.end();
}

function getTimeline(theFRO) {
	if (theFRO.summonerForTimeline > 9) {
        //We're done!
		theFRO.state = FINISHED;
		return;
    }

	var summonerDataCurrentMatch = theFRO.summonerDataCurrentMatch;
	var summonerData = {};
	var changeState = true;
	//find summoner data we are working with
	var matchesToFetch = theFRO.summonerDataCurrentMatch[theFRO.summonerForTimeline].recentMatchesWithCurrentChamp;
	
	var matchId;
	for(var i = 0; i < matchesToFetch; i++){
		if (!matchesToFetch[i].timeLine && !matchesToFetch[i].startedTimeLineRetrieval) {
            //we found a match without a timeline
			matchId = matchesToFetch[i].matchId;
        }
	}
	
	//https://na.api.pvp.net/api/lol/na/v2.2/match/2106980098?includeTimeline=true&api_key=29b7f478-99c4-46af-b831-b5605e1b42af
	var reqString = '';
	reqString = getMatchTimeLine
		  + matchId
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
			reportError(JSONResponseObject.status[Object.getOwnPropertyNames(JSONResponseObject.status)[1]]);
		} else {
			
		}
		
    });
  });
  req.end();
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