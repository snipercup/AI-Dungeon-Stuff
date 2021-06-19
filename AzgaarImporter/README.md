# Azgaar importer
This tool converts data exported from [Azgaar's map creator](https://azgaar.github.io/Fantasy-Map-Generator/) to a format you can import into AI dungeon world info. This allows you to play on a fantasy map you created in Azgaar. 

You can check out a couple of examples in the [WorldInfoOutput](https://github.com/snipercup/AI-Dungeon-Stuff/tree/main/AzgaarImporter/WorldInfoOutput)  folder. You can import them into AI dungeon but they need [Taleir's scripts](https://github.com/TaleirOfDeynai/wip-ai-dungeon-mods) 
Note: This tool only imports land cells for now, no ocean cells

## How to use
1. Go to the [main page](https://github.com/snipercup/AI-Dungeon-Stuff) and click the green code button on the top-right. 
1. Click on download zip and once it is downloaded, extract it somewhere on your computer. 
1. Go into the AzgaarImporter folder and open AzgaarImporter.html in your browser. 
1. Go to [Azgaar's map creator](https://azgaar.github.io/Fantasy-Map-Generator/) and create your map. Here are some important settings that help to create better output:
   1. Under 'Options':
   1. Set 'Points number' to the lowest setting (1k)
   1. Set 'Map template' to Pangea
   1. Put States number to 10
   1. Put Provinces ratio to 25
   1. You can play around with the settings but the above is recommended
1. Next, you need to export some data from the map you created in Azgaar's map creator
   1. Click on 'Save' and press the '.json' button. Click Cells and save the file on your computer
   1. Also click on 'jpeg' to download an image of the map. You need it later.
   1. In the menu go to 'tools' and under the 'Click to configure' click on:
      1. Biomes and click the download button in the bottom-right of the window that pops up
      1. States and click the download button in the bottom-right of the window that pops up
      1. Provinces and put the 'State' in the bottom-right to 'all'. Next, click the download button
      1. Cultures and click the download button in the bottom-right of the window that pops up
      1. Religions and click the download button in the bottom-right of the window that pops up
   1. In the menu go to 'tools' and under the 'Click to overview' click on 'Burgs'
      1. Set 'State' to 'all'
      1. Set 'Culture' to 'all'
      1. Click the download button and download the csv
1. Now that you downloaded all the data you need, open all the files you downloaded in a text editor like notepad++
1. Go back to the Azgaar import tool you opened in your browser earlier. You need to copy all the downloaded data into the corresponding fields in the tool.
   1. The cell data (JSON format) goes into the textarea under 'Cell geojson data'
   1. The burgs data (CSV format) goes in the textarea under 'Burgs csv data'
   1. The states data (CSV format) goes in the textarea under 'Surgs csv data'
   1. The Provinces data (CSV format) goes in the textarea under 'Provinces csv data'
   1. The Biome data (CSV format) goes in the textarea under 'Biome csv data'
   1. The Culture data (CSV format) goes in the textarea under 'Culture csv data'
   1. The Religion data (CSV format) goes in the textarea under 'Religion csv data'
1. Now that you have entered all the data from your Azgaar map, click on the 'Process data' button in the bottom-left
1. You see a list of checkboxes appear on the right. Each checkbox corresponds to the states of your map. Uncheck the states you don't want to import into AID. You should uncheck some, because otherwise there will be a lot of data to import. To choose what states to uncheck, you should look at the image of your map you downloaded earlier and choose some states on the edges of the map so no holes are left if they don't get imported into AI dungeon.
1. Click on 'Convert cells'. The output you need is under 'JSON Output'. Copy all the output and put it in a text file and save it as 'worldinfo.json' somewhere on your computer
2. Go to AI dungeon and import [Taleir's scripts](https://github.com/TaleirOfDeynai/wip-ai-dungeon-mods).
3. Click on 'world info' in your adventure or scenario.
4. Click on the import button on the top-right. Now your data is imported.
      
