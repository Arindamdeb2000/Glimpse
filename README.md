# Glimpse
Glimpse allows a user to search for a state or city in the United States and view statistics for the place such as current job listings on Glassdoor, rent cost, average age, population and more. There is a video demo [here](https://vid.me/DhOlB).

## Setup
If you want to work with Glimpse, you will first need to acquire API keys from Glassdoor, Mapbox and the United States Census Bureau. Then you can download the project files and plug your keys into the code to get Glimpse working.
* [Glassdoor API Key](https://www.glassdoor.com/developer/register_input.htm)
* [Mapbox API Key](https://www.mapbox.com/help/define-access-token/)
* [United States Census Bureau API Key](http://api.census.gov/data/key_signup.html)

## Helpful Documentation
Here are some helpful links for working with technologies used by Glimpse:
* [Glassdoor API](https://www.glassdoor.com/developer/index.htm)
* [Mapbox GL JS](https://www.mapbox.com/mapbox-gl-js/api/)
* [Mapbox GL JS Styling Specs](https://www.mapbox.com/mapbox-gl-js/style-spec/)
* [Mapbox Geocoder](https://github.com/mapbox/mapbox-gl-geocoder/blob/master/API.md)
* [CitySDK](https://uscensusbureau.github.io/citysdk/developers/gettingstarted/) (some parts of the documentation are out of date)
* [Bootstrap](http://getbootstrap.com)

## Known Issues
* There is an issue with loading census stats for many cities in Hawaii
* Location search suggestions still include locations like businesses
* Inconsistent behavior for Safari on iOS. Some people have encountered issues with only a white screen being shown and with Glassdoor jobs not loading.

## TODO
* Closing the popup for a place requires you to search for the place again to make the popup reappear. Need to figure out a nice way to handle this
* Add additional info from Glassdoor and the census about popular job sectors for places
* Add ability to compare how a place’s stats compare to another’s
* Add ability to see how a place’s stats compare to the averages for the state or the entire country
* Add pie chart to better show how the population breaks down into races
* Use GeoJSON to draw boundaries and shade the area of the city or state being viewed
* Reset active tab to overview if user closes the stats modal
* Search by zip code
