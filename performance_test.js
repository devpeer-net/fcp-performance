import * as ChromeLauncher from 'chrome-launcher';
import CRI from 'chrome-remote-interface';
import csv from 'csvtojson';
import Debug from 'debug';
const debug = Debug('fcp-performance');
import fs from 'node:fs';
import * as si from 'systeminformation';
import { program } from 'commander';

class TestRun {
  constructor(productVersion, measurements, datetime, osInfo, browserArgs) {
    this.productVersion = productVersion;
    this.measurements = measurements;
    this.datetime = datetime;
    this.osInfo = osInfo;
    this.browserArgs = browserArgs;
  }
}

class Measurement {
  constructor(url, fcp, datetime) {
    this.url = url;
    this.fcp = fcp;
    this.datetime = datetime;
  }
}

const getUrls = async (filepath) => {
  const domains = await csv().fromFile(filepath);
  return domains.map(row => 'https://' + row.domain);
}

const measureFCPPerformance = async (client, url) => {
  try {

    const { Page, Runtime } = client;

    debug("navigating");
    const navigationPromise = Page.navigate({ url });
    await Promise.race([navigationPromise,
      new Promise((_, reject) => setTimeout(() => reject('timeout'), 10000))]);
    if (navigationPromise.errorText) {
      throw new Error(navigationPromise.errorText);
    }
    debug("waiting for fcp");
    const startTime = await Runtime.evaluate({
      expression: `new Promise((resolve, reject) => {
  new PerformanceObserver((entryList) => { \
    for (const entry of entryList.getEntriesByName('first-contentful-paint')) { \
      resolve(entry.startTime); \
    } \
  }).observe({type: 'paint', buffered: true});
  setTimeout(() => reject('timeout'), 10000);
})`,
      awaitPromise: true
    });
    debug("fcp", startTime);
    return startTime.result.value;

  } catch (error) {
    debug(error);
    return Infinity;
  }
}

const runTest = async (options) => {
  const browserArgsList = options.browserArgs.split(' ');
  debug("browserArgsList", browserArgsList);
  if (options.launchChrome) {
  debug("Launching chrome");
    const chrome = await ChromeLauncher.launch({
      port: options.port,
      chromeFlags: browserArgsList
    });
  }
  try {
    debug("getting protocol interface");
    const client = await CRI({ host: options.host, port: options.port });

    const { Page, Browser } = client;

    debug("getting browser version");
    const version = await Browser.getVersion();
    debug("connected to browser", version);
    debug("enabling page events");
    await Page.enable();

    const testsStartTime = new Date().toISOString();
    const urls = await getUrls(options.input);
    let measurements = [];
    for (const url of urls) {
      const startTime = new Date().toISOString();
      const fcpTime = await measureFCPPerformance(client, url);
      measurements.push(new Measurement(url, fcpTime, startTime));
    }

    // Save system information for the test run.
    const osInfo = await si.osInfo();
    delete osInfo.serial;
    delete osInfo.hostname;
    delete osInfo.fqdn;
    // Save results to a JSON file.
    const testRun = new TestRun(version.product, measurements, testsStartTime, osInfo, browserArgsList);
    fs.writeFileSync(options.output, JSON.stringify(testRun));

    await client.close();
  } catch (error) {
    console.error(error);
  } finally {
    chrome.kill();
  }
}

program
    .name('fcp-performance')
    .description('A tool to measure First Contentful Paint performance of a list of URLs.')
    .version('0.1.0');

// Define options and commands here
program
    .option('-i, --input <filename>', 'Input filename containing a list of URLs to test, it should be a CSV file with a column named "domain" containing the domain names. Default is "moz.com_top500.csv"', 'moz.com_top500.csv')
    .option('-o, --output <filename>', 'Name for an output file to save the JSON results. Default is "fcp-performance.json"', 'fcp-performance.json')
    .option('-b, --browser-args <args>', 'Arguments to pass to the browser instance. Default is "--disable-gpu --no-sandbox --headless"', '--disable-gpu --no-sandbox --headless')
    .option('-l, --launch-chrome', 'Launch Chrome in a separate process. Default is true', true)
    .option('-h, --host <hostname>', 'Hostname to use to connect to Chrome DevTools. Default is localhost', 'localhost')
    .option('-p, --port <port>', 'Port to use to connect to Chrome DevTools. Default is 9222', 9222);

// Parse the command line arguments
program.parse(process.argv);

const options = program.opts();

debug("options", options);

await runTest(options);
