// Global variables used for keeping up with current place location information and requests
var currentCity = "";
var currentState = "";
var currentLat;
var currentLng;
var isState = false;
var lastRequestDone = true;
var newRequestMade = false;
var previousRequestPlace = "";
var requestError = false;

var censusApiKey = "<your census api key here>";
var glassdoorApiKey = "<your glassdoor api key here>";
var glassdoorPartnerId = "<your glassdoor partner id here>";
var mapboxApiKey = "<your mapbox api key here>";

$(document).ready(function () {

    // Set bounds on the map so the user can only view the United States (and a few other countries thanks to Alaska and Hawaii)
    var bounds = [
        [-171.5203664985572, 9.102110705043486], // Southwest coordinates
        [-34.41099149856183, 72.18180788440932]  // Northeast coordinates
    ];

    // Create map and start with it centered on the United States
    mapboxgl.accessToken = mapboxApiKey;
    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v9',
        center: [-98.2559, 39.09660972806529],
        zoom: 4,
        maxBounds: bounds
    });

    // Add city search input to map and only allow cities in the United States to be found
    var geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        country: "us"
    });
    map.addControl(geocoder);

    // Things to handle once the map finishes loading
    map.on('load', function () {

        // Create popup that shows stats button over a city once the user completes a search (not rendered yet)
        var popup = new mapboxgl.Popup({ offset: [0, 0] });

        // Fires when a city is found after user starts search
        geocoder.on('result', function (locationSearch) {

            // Get the place searched and split the name into parts
            var place = locationSearch.result.place_name.split(',');

            // Glimpse only supports cities and states
            // A city is formatted like: CityName, StateName, Country (so it splits into 3 parts)
            // A state is formatted like: StateName, Country (so it splits into 2 parts)
            // Anything that splits into more than 3 parts or less than 2 parts is not a city or state
            if (place.length === 3 || place.length === 2) {
                if (place.length === 2) {
                    // State search
                    currentCity = "";
                    currentState = place[0];
                    isState = true;
                } else {
                    // City search
                    currentCity = place[0];
                    currentState = place[1].substring(1, place[1].length);
                    isState = false;
                }

                // Save the current lat and long from most recent search
                currentLat = locationSearch.result.geometry.coordinates[1];
                currentLng = locationSearch.result.geometry.coordinates[0];

                // Render popup
                popup.setLngLat([currentLng, currentLat])
                    .setHTML('<a href="#" class="btn btn-default" style="margin: 5px;" onclick="getStats()" title="View Stats">Stats <span class="glyphicon glyphicon-info-sign"></a>')
                    .setLngLat([currentLng, currentLat])
                    .addTo(map);
            }
            else {
                // User attempted to look up a place that isn't a city or state -> show warning
                $("#messageModalText").text("Glimpse currently only supports stats for cities and states. Please try another search.");
                $("#warningModal").modal("show");
            }
        });

        geocoder.on('error', function (error) {
            $("#messageModalText").text("There was an error processing your search. Please try again.");
            $("#warningModal").modal("show");
        });
    });
});

function resetModal(){
    // Empty stat lists
    $("#overviewList").empty();
    $("#popList").empty();

    // Hide any error messages previous place
    $("#overviewCensusError").hide();
    $("#overviewJobsError").hide();
    $("#populationError").hide();

    // Hide loading notifications from previous place
    $("#loadingMessage").hide();
    $("#loadingMessagePop").hide();

    // Set title of modal to say what place is being viewed
    if (isState) {
        $("#modalTitle").text("Stats for " + currentState);
    } else {
        $("#modalTitle").text("Stats for " + currentCity + ", " + currentState);
    }
}

// Get all of the stats for the stats modal
function getStats() {

    // Show modal
    $("#statsModal").modal("show");

    /*
     * Check to see if the user has searched for a new place
     * since the last time they opened the stats modal. If the
     * user is still on the same city, this check stops the API
     * requests from being made again.
    */
    var newPlace = currentCity + currentState;
    if (previousRequestPlace != newPlace || requestError) {

        // Reset modal content
        resetModal();

        // Check that the last set of requests submitted have finished before starting new ones
        if (lastRequestDone) {

            // Set new previousRequestPlace value to match this request
            previousRequestPlace = currentCity + currentState;

            // Used to keep up with when API requests are completed
            var overviewCensusStatsDone = false;
            var glassdoorStatsDone = false;
            var populationStatsDone = false;

            // Used to let know future requests know if this set of requests have finished
            lastRequestDone = false;
            requestError = false;

            /*
             * Used to know if a user has made a request for a different place's stats before
             * the requests for this place have finished. If the user made a request for stats for
             * somewhere else before the requests for this place have finished, the information
             * returned by these requests shouldn't be displayed in the stats modal.
            */
            newRequestMade = false;

            // Set loading messages while waiting for API data
            $("#loadingMessage").show();
            $("#loadingMessagePop").show();

            // Hide the retry button and warning if they are currently shown
            $("#retryBtn").hide();
            $("#overviewWarning").hide();

            // Create CensusModule to make CitySDK API requests
            var census = new CensusModule(censusApiKey);

            // CensusModule uses a level option to determine whether to get stats for a city or a state
            var level;
            if (isState) {
                level = "state";
            } else {
                level = "place";
            }

            // Set parameters for getting stats for the overview tab
            var overviewRequest = {
                "lat": currentLat,
                "lng": currentLng,
                "year": "2014",
                "level": level,
                "variables": ["population",
                              "age",
                              "income",
                              "median_contract_rent",
                              "median_home_value",
                              "poverty"]
            };

            // Set parameters for getting stats for the population tab
            var populationDetailRequest = {
                "lat": currentLat,
                "lng": currentLng,
                "year": "2014",
                "level": level,
                "variables": ["population_black_alone",
                              "population_white_alone",
                              "population_hispanic_origin",
                              "population_american_indian_alone",
                              "population_asian_alone",
                              "population_native_hawaiian_alone",
                              "population_other_alone",
                              "population_two_or_more_races"]
            };

            // Get data for overview tab
            census.apiRequest(overviewRequest, function (response) {

                // The response will be "ERROR" if an error occurs
                if (response != "ERROR" && response != null && response.data != null && response.data.length > 0) {

                    // Save results into variables that make more sense to humans
                    var population = response.data[0].B01003_001E;
                    var averageAge = response.data[0].B01002_001E;
                    var averageIncome = response.data[0].B19013_001E;
                    var medianRent = response.data[0].B25058_001E;
                    var medianHomeValue = response.data[0].B25077_001E;
                    var povertyPop = response.data[0].B17001_002E;

                    // Make sure this data is still up to date with what place the user is viewing
                    if (!newRequestMade) {
                        $("#overviewList").append(
                            '<li class="list-group-item"><strong>Population: </strong>' +
                                population.replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
                            '</li>' +
                            '<li class="list-group-item"><strong>Average Age: </strong>' +
                                averageAge +
                            '</li>' +
                            '<li class="list-group-item"><strong>Average Income: </strong>$' +
                                averageIncome.replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
                            '</li>' +
                            '<li class="list-group-item"><strong>Median Rent: </strong>$' +
                                medianRent.replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
                            '</li>' +
                            '<li class="list-group-item"><strong>Median Home Value: </strong>$' +
                                medianHomeValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
                            '</li>' +
                            '<li class="list-group-item"><strong>People Under Poverty Line: </strong>' +
                                povertyPop.replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
                                " (" + ((parseInt(povertyPop) / parseInt(population)) * 100).toFixed(2) +
                            '%)</li>'
                        );
                    }
                } else {
                    if (!newRequestMade) {
                        $("#overviewCensusErrorMessage").text("Census stats could not be loaded");
                        $("#loadingMessage").hide();
                        $("#overviewCensusError").show();
                        $("#retryBtn").show();
                        requestError = true;
                    }
                }

                overviewCensusStatsDone = true;

                // Check if the loading message can be removed yet
                if (glassdoorStatsDone && overviewCensusStatsDone) {
                    $("#loadingMessage").hide();
                    if (populationStatsDone) {
                        lastRequestDone = true;
                    }
                }
            });

            // Get data for population tab
            census.apiRequest(populationDetailRequest, function (response) {

                // The response will be "ERROR" if an error occurs
                if (response != "ERROR" && response != null && response.data != null && response.data.length > 0) {

                    // Save population information into more human readable variables
                    var africanAmericanPop = { race: "African American", count: parseInt(response.data[0].B02001_003E) };
                    var whitePop = { race: "White", count: parseInt(response.data[0].B02001_002E) };
                    var hispanicPop = { race: "Hispanic", count: parseInt(response.data[0].B03001_003E) };
                    var asianPop = { race: "Asian", count: parseInt(response.data[0].B02001_005E) };
                    var hawaiianPop = { race: "Native Hawaiian", count: parseInt(response.data[0].B02001_006E) };
                    var americanIndianPop = { race: "American Indian", count: parseInt(response.data[0].B02001_004E) };
                    var twoRacePop = { race: "Two Races", count: parseInt(response.data[0].B02001_008E) };
                    var otherPop = { race: "Other", count: parseInt(response.data[0].B02001_007E) };

                    // Calculate total population
                    var totalPop = africanAmericanPop.count +
                        whitePop.count +
                        hispanicPop.count +
                        asianPop.count +
                        hawaiianPop.count +
                        americanIndianPop.count +
                        twoRacePop.count +
                        otherPop.count;

                    // Create array of all races
                    var races = [africanAmericanPop, whitePop, hispanicPop, asianPop, hawaiianPop, americanIndianPop, twoRacePop, otherPop];

                    // Sort the array by count of each race (largest group 1st in array, smallest last)
                    races.sort(function (a, b) {
                        var x = a.count;
                        var y = b.count;
                        return ((x < y) ? 1 : ((x > y) ? -1 : 0));
                    });

                    // Cache popList element so it doesn't need to be fetched for each race
                    var popList = $("#popList");

                    // Make sure this data is still up to date with what place the user is viewing
                    if (!newRequestMade) {

                        // Add each race to the population tab list group (includes a percent)
                        for (var i = 0; i < races.length; i++) {
                            if (races[i].count > 0) {
                                popList.append(
                                    '<li class="list-group-item"><strong>' +
                                    races[i].race + ':</strong > ' +
                                    races[i].count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                                    + ' (' + ((races[i].count / totalPop) * 100).toFixed(2) + '%)</li>'
                                )
                            }
                        }
                    }
                } else {
                    if (!newRequestMade) {
                        $("#populationErrorMessage").text("Census stats could not be loaded");
                        $("#populationError").show();
                        $("#retryBtn").show();
                        requestError = true;
                    }
                }

                // Remove loading message
                $("#loadingMessagePop").hide();

                populationStatsDone = true;

                // Check if all requests for this place have finished
                if (overviewCensusStatsDone && populationStatsDone && glassdoorStatsDone) {
                    lastRequestDone = true;
                }
            });

            // Glassdoor query parameters are different for cities and states
            var glassdoorAPIQuery = "http://api.glassdoor.com/api/api.htm?t.p=" + 
                                        glassdoorPartnerId + "&t.k=" +
                                        glassdoorApiKey + "&userip=0.0.0.0&useragent=&format=json&v=1&action=jobs-stats&";
            if (isState) {
                glassdoorAPIQuery += "returnStates=true&l=" + currentState + ",usa&callback=?";
            } else {
                glassdoorAPIQuery += "returnCities=true&l=" + currentCity + "," + currentState + "&callback=?";
            }

            // Get jobs data from Glassdoor
            $.ajax({
                url: glassdoorAPIQuery,
                dataType: 'json',
                timeout: 5000,
                success: function (json) {

                    // Start building the list item html
                    var listItemHTML = '<li class="list-group-item"><strong>Jobs Openings (Glassdoor): </strong>';

                    // Glassdoor returns a different JSON format for states and cities so we need to check which one we are working with
                    if (isState) {
                        listItemHTML += json.response.states[currentState].numJobs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    } else {
                        listItemHTML += json.response.cities[0].numJobs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    }

                    listItemHTML += '</li>';

                    // Make sure this data is still up to date with what place the user is viewing
                    if (!newRequestMade) {
                        $("#overviewList").append(listItemHTML);
                    }
                },
                error: function (x, t, m) {
                    if (t === "timeout") {
                        if (!newRequestMade) {
                            $("#overviewJobsErrorMessage").text("Current Glassdoor job count could not be loaded");
                            $("#overviewJobsError").show();
                            $("#retryBtn").show();
                            requestError = true;
                        }
                    }
                },
                complete: function () {

                    glassdoorStatsDone = true;

                    // Check if the loading message can be removed yet
                    if (glassdoorStatsDone && overviewCensusStatsDone) {
                        $("#loadingMessage").hide();
                        if (populationStatsDone) {
                            lastRequestDone = true;
                        }
                    }
                }
            });
        } else {

            // User tried to load stats for new place before letting stats for last place finish loading
            $("#overviewWarning").show();
            $("#retryBtn").show();
            newRequestMade = true;
        }
    }
}