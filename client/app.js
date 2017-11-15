// TODO remove baseURL if ajax is ready
var baseUrl = "file:///home/carlo/Entwicklung/Javascript/h4c"
var data_promise;
var timeseries_promise;
var panelOpen = false;

// Add map, show europe
var map = L.map('map').setView([48.5260926, 10.0723436], 5)
	.on('click', closePanel);

// Add tiles
L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
	attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Get data and show markers
data_promise = new Promise(function (resolve, reject) {
	//$.get("http://192.168.1.10:3000/last", resolve, "json");
	$.get("http://api.luftdaten.info/static/v1/data.json", resolve, "json");
});

data_promise.then(setMarkers);

function setMarkers(data_set) {
	// Create div icon
	var sensorIcon = L.divIcon({
		className: 'sensor-icon',
		html: '<span class="sensor-inner"></span>'
	});

	// Add cluster group for markers
	var markers = L.markerClusterGroup({
		showCoverageOnHover: false,
		maxClusterRadius: function (zoom) {
			return (zoom <= 14) ? 50 : 1;
		}
	});

	// Add single markers to cluster
	_.each(data_set, function(dat) {
		var marker = L.marker([dat.location.latitude, dat.location.longitude], {icon: sensorIcon})
			.on('click', function() { 
				if(!panelOpen) {
					openPanel(dat.id);
				} else {
					closePanel('fade');
					openPanel(dat.id, 'fade');
				}	
			});
		markers.addLayer(marker);
	});

	// Add marker cluster to map
	map.addLayer(markers);

	// Fade out loading
	$('#loading').fadeOut();
}

function openPanel(sensorId, transition) {
	if(_.isUndefined(transition)) transition = 'default';
	panelOpen = true;
	
	
	// TODO Do AJAX here instead of timeseries_promise
	var readJson = Promise.promisify(d3.json);
	timeseries_promise = readJson(baseUrl+"/timeseries.json");
	
	/*timeseries_promise = new Promise(function (resolve, reject) {
		//$.get("http://192.168.0.144:3000/history/"+sensorId, resolve, "json");
		$.get("http://api.luftdaten.info/static/v1/data.json", resolve, "json");
	});*/
	
	/*data_promise.then(function(data) {
		d = _.where(data, {id: 484729634})
		var measures = _.map(d, function(m) {
			return { timestamp: m.timestamp, sensordatavalues: m.sensordatavalues }
		});
		console.log(measures);
		var sensorMeasurements = {
			id: d.id,
			sampling_rate: d.sampling_rate,
			timestamp: d.timestamp,
			location: d.location,
			sensor: d.sensor,
			measures: d.measures
		}
		
		return sensorMeasurements;
	}).then(function(s) {
		
	});*/
	
	timeseries_promise.then(function(s) {
		// Set sensor meta values
		$('#panel .location').text(s.location.latitude+', '+s.location.longitude);
		$('#panel .id').text(s.id);
		$('#panel .type').text(s.sensor.sensor_type.name);
		$('#panel .lasttime').text(s.timestamp);
		
		// Remove meta data and prepare time
		var timeseries = _.map(s.measures, function(m) {
			// Get hour from time
			m.hour = moment(m.timestamp, 'YYYY-MM-DD HH:mm:ss').hour();
			return m;
		});
		
		// Remove multi value
		// OPTIONAL TODO average instead of removing
		timeseries = _.uniq(timeseries, function (item) { return item.timestamp; });
		
		// Find types
		var types = _.pluck(timeseries[0].sensordatavalues, 'value_type');
		
		// Show panel
		if(transition == 'fade')
			$('#panel').fadeTo(500, 1, drawPlot.bind(drawPlot, timeseries, types))
		else
			$('#panel').animate({ "width": "40%", "opacity": "0.9" }, 300,
							drawPlot.bind(drawPlot, timeseries, types));
	});
}

function closePanel(transition) {
	if(_.isUndefined(transition)) transition = 'default';
	
	// Hide panel and empty barplots
	if(transition == 'fade')
		$('#panel').fadeTo(500, 0.3);
	else
		$('#panel').animate({ "width": "0", "opacity": "0" }, 300);
	
	$('.barplots').empty();
	panelOpen = false;
}

function drawPlot(ts, types) {
	// Draw plot for every value type
	var i = 0;
	_.each(types, function(tp) {
		$('.barplots').append('<div id="plt-'+tp+'"><h2>'+tp+'</h2><div class="plt"></div></div>');
		
		// Set the dimensions and margins of the graph
		var margin = {top: 20, right: 20, bottom: 30, left: 40};
		var width = $('#panel').width() - margin.left - margin.right;
		var height = 200 - margin.top - margin.bottom;

		// set the ranges
		var x = d3.scaleBand()
				  .range([0, width])
				  .padding(0.1);
		var y = d3.scaleLinear()
				  .range([height, 0]);

		// append the svg object to the body of the page
		// append a 'group' element to 'svg'
		// moves the 'group' element to the top left margin
		var svg = d3.select('#plt-'+tp+' .plt').append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
			.append("g")
			.attr("transform", 
				  "translate(" + margin.left + "," + margin.top + ")");

		// Scale the range of the data in the domains
		x.domain(ts.map(function(d) { return d.hour; }));
		y.domain([0, d3.max(ts, function(d) { return d.sensordatavalues[i].value; })]);
		
		// append the rectangles for the bar chart
		svg.selectAll(".bar")
			.data(ts)
			.enter().append("rect")
			.attr("class", "bar")
			.attr("x", function(d) { return x(d.hour); })
			.attr("width", x.bandwidth())
			.attr("y", function(d) { return y(d.sensordatavalues[i].value); })
			.attr("height", function(d) { return height - y(d.sensordatavalues[i].value); });
		
		// add the x Axis
		svg.append("g")
			.attr("transform", "translate(0," + height + ")")
			.attr("class", "axis")
			.call(d3.axisBottom(x));

		// add the y Axis
		svg.append("g")
			.attr("class", "axis")
			.call(d3.axisLeft(y));
		
		// Add limit if sensor has pm data
		/*if(tp == "") {
			svg.append("line")
				.attr("class", "limit")
				.attr("x1", x(d3.min(ts, function(d) { return d.timestamp; })))
				.attr("x2", x(d3.max(ts, function(d) { return d.timestamp; })))
				.attr("y1", y(5))
				.attr("y2", y(5))
		}*/
		
		i += 1;
	});
}
