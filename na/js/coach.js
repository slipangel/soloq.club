var queries = {};
  $.each(document.location.search.substr(1).split('&'),function(c,q){
    var i = q.split('=');
    console.log(i);
	   	if(i.length > 0 && i[0] == "matchid"){
	   		queries[i[0].toString()] = i[1].toString();
	   	}else{
	   		alert("no match selected!");
	   	}
  });


$.ajax("http://localhost:3000/matchId/"+queries.matchid).done(function(res){
	graphdata = {};
	timemax = 0;
	goldmax = 0;

	$.each(res, function(participantnum, participant){
		team = participant.teamId;
		champ = participant.champId;
		graphdata[champ] = [];
		$.each(participant.timeline, function(minute, stats){
			if(stats.gold > goldmax){
				goldmax = stats.gold;
			}
			if(parseInt(minute) > timemax){
				timemax = minute;
			}
			graphdata[champ].push({"gold":stats.gold,"minute":minute});
		})
	})
	
	//Bind to the Visualization SVG and store properties
	var vis = d3.select("#visualisation"),
	    WIDTH = 1000,
	    HEIGHT = 500,
	    MARGINS = {
	        top: 20,
	        right: 20,
	        bottom: 20,
	        left: 50
	    }

	//Create scales using d3.scale.linear()
	xScale = d3.scale.linear().range([MARGINS.left, WIDTH - MARGINS.right]).domain([0,timemax]),

	yScale = d3.scale.linear().range([HEIGHT - MARGINS.top, MARGINS.bottom]).domain([500,goldmax]),

	//Create axis and pass them the scales created above
	xAxis = d3.svg.axis()
	    .scale(xScale),
	  
	yAxis = d3.svg.axis()
	    .scale(yScale)
	    .orient("left");

	// append the scales to the svg referenced by vis
	vis.append("svg:g")
	    .attr("transform", "translate(0," + (HEIGHT - MARGINS.bottom) + ")")
	    .call(xAxis);

	vis.append("svg:g")
		.attr("transform", "translate(" + (MARGINS.left) + ",0)")
	    .call(yAxis);

	var lineGen = d3.svg.line()
	  .x(function(d) {
	    return xScale(d.minute);
	  })
	  .y(function(d) {
	    return yScale(d.gold);
	  });

	$.each(graphdata, function(champId, timeline){
		vis.append('svg:path')
		  .attr('d', lineGen(timeline))
		  .attr('stroke', 'green')
		  .attr('stroke-width', 2)
		  .attr('fill', 'none');
	});
});


