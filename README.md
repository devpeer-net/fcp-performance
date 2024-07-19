# First Contentful Paint Performance Test

This script, `performance_test.js`, is designed to measure the page rendering performance of a web browser. The script measures the First Contentful Paint (FCP), which is a key performance metric indicating the time at which the first text or image is painted on the screen aster navigating to a web page.

## Features

- Measures First Contentful Paint (FCP) to evaluate the performance of a web browser in rendering a webpage.
- Logs performance metrics to the console for easy observation and analysis.
- Saves test results with associated data to a JSON file.

## Quick Start

To run this script, follow these steps:

1. Ensure you have Node.js installed on your system. You can download it from [Node.js official website](https://nodejs.org/).

2. Clone the repository and change directory to it.
  ```bash
  git clone https://github.com/devpeer-net/web-rendering-performance.git
  cd web-rendering-performance
```
3. Install dependencies
  ```bash
  npm install
```
4. Run the script using Node.js by executing the following command:
  ```bash
  node performance_test.js
```
To specify a browser version, you can set the path to its executable with the CHROME_PATH environmental variable.

For more information on available command line options see help.
  ```bash
  node performance_test.js -h
```