const express = require('express');
const path = require('path');
const http = require('http');
const bodyParser = require('body-parser');
const request = require('request');
const btoa = require('btoa');
const serveStatic = require('serve-static');
const _ = require('lodash');
const moment = require('moment-business-days');
const gecko = require('geckoboard')('c471820f20b3473ede170adb6589f229');


const API = 'https://app.close.io/api/v1/';
const token = '8c94e40011d3a9d79cef879e07863727061d830f9a26edaba03dcb62';
const headers = {'Authorization': 'Basic ' + btoa(token + ':""')};

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(serveStatic(__dirname, {'index': ['public/index.html']}));

var businessDaysThisMonth = moment('12-01-2017','MM-DD-YYYY').monthBusinessDays().length;
var remainingDaysThisMonth = moment().businessDiff(moment('12-31-2017','MM-DD-YYYY'));
var elapsedDaysThisMonth = moment().businessDiff(moment('12-01-2017','MM-DD-YYYY'));
var percentBooked = elapsedDaysThisMonth / businessDaysThisMonth;
var percentPerformed = elapsedDaysThisMonth / businessDaysThisMonth;

var users = [
    {
        id: 'user_nj1EsYCg3dylxTldjAhlIPcndp4Dxhi7L381rLILzha', 
        name: 'Mark Carter', 
        fname: 'mark'
    },
    {
        id: 'user_7orOE41C1yTo0pCE3GPPM4sAyMbvC64QF0Flyx99VJw', 
        name: 'Matt Calligan', 
        fname: 'matt'
    },
    {
        id: 'user_Lm0fDWotK8ulu7Cpym8GoZUF5Jnt2R8oRHGUUphpMyj', 
        name: 'Jonathan Woodruff', 
        fname: 'jon'
    }
];

var images = {
    matt: {
        over: 'http://res.cloudinary.com/ddkp1ojwe/image/upload/v1513281561/sales/obojkzkycjrvktfrftzg.png',
        under: 'http://res.cloudinary.com/ddkp1ojwe/image/upload/a_180/v1513281561/sales/obojkzkycjrvktfrftzg.png'
    },
    mark: {
        over: 'http://res.cloudinary.com/ddkp1ojwe/image/upload/v1513281711/sales/cjrw9mjjdzvlzyynordx.jpg',
        under: 'http://res.cloudinary.com/ddkp1ojwe/image/upload/a_180/v1513281711/sales/cjrw9mjjdzvlzyynordx.jpg'
    },
    jon: {
        over: 'http://res.cloudinary.com/ddkp1ojwe/image/upload/v1513280526/sales/jon.png',
        under: 'http://res.cloudinary.com/ddkp1ojwe/image/upload/a_180/v1513280526/sales/jon.png'
    }
}

var metrics = {
    sales: {
        booked: {
            target: process.env.BOOKED_TARGET,
            expected: Math.round(process.env.BOOKED_TARGET * percentBooked * 100) / 100
        },
        performed: {
            target: process.env.PERFORMED_TARGET,
            expected: Math.round(process.env.PERFORMED_TARGET * percentPerformed * 100) / 100
        }
    }
};

app.get('/test', (req, res) => {
    res.send(metrics);
});

app.get('/image', (req, res) => {
    if (Object.keys(req.query).length > 0) {
        var fname = Object.keys(req.query)[0];

        if (metrics.sales.performed[fname].actual > metrics.sales.performed.expected) {
            res.writeHead(301, {Location: images[fname].over});
            res.end();
        } else if (metrics.sales.performed[fname].actual < metrics.sales.performed.expected) {
            res.writeHead(301, {Location: images[fname].under});
            res.end();
        }
    }
});

function getData() {
    var promises = [];

    users.map(function(user) {
        // Get Opportunities
        var url = API + 'report/activity/orga_VmrjYdiRSHUDQ1NnTxCnt1w8Cqa9olIQsExlq3vziO7';
        var query = {
            date_start: '12/1/2017', 
            date_end: '12/31/2017', 
            user_id: user.id
        };
        var promise = new Promise(function (resolve, reject) {
            var params = {
                url: url, 
                qs: query, 
                headers: headers
            };

            request.get(params, (err, response, body) => {
                resolve({body: JSON.parse(body), user: user, type: 'opportunity'});
            });
        });

        promises.push(promise);
        
        // Get Presentations
        url = API + 'report/statuses/lead/orga_VmrjYdiRSHUDQ1NnTxCnt1w8Cqa9olIQsExlq3vziO7';
        query = {
            query: 'opportunity_user:"' + user.name + '"', 
            date_end: '2018-01-01T04:59:59.999Z', 
            date_start: '2017-12-01T05:00:00.000Z'
        };
        promise = new Promise(function (resolve, reject) {
            var params = {
                url: url, 
                qs: query, 
                headers: headers
            };

            request.get(params, (err, response, body) => {
                resolve({body: JSON.parse(body), user: user, type: 'presentation'});
            });
        });

        promises.push(promise);
    });

    Promise.all(promises).then(function (result) {

        // Update Metrics after all API calls
        result.forEach(function (data) {
            if (data.type === 'opportunity') {
                metrics.sales.booked[data.user.fname] = {actual: data.body.opportunities_created};
            } else {
                var filtered = _.filter(data.body.status_overview, {'status_label': 'Presented'});
                if (filtered.length > 0) {
                    metrics.sales.performed[data.user.fname] = {actual: filtered[0].gained};
                }
            }
        });

        users.map(user => {
            setGeckoData(user.fname, user.name);
        });
    });
}

function setGeckoData(fname, name) {
    gecko.datasets.findOrCreate(
        {
            id: 'metrics.sales.' + fname,
            fields: {
                booked_target: {
                    type: 'number',
                    name: 'Target Booked'
                },
                booked_expected: {
                    type: 'number',
                    name: 'Expected Booked'
                },
                booked_actual: {
                    type: 'number',
                    name: 'Actual Booked'
                },
                performed_target: {
                    type: 'number',
                    name: 'Target Presented'
                },
                performed_expected: {
                    type: 'number',
                    name: 'Expected Presented'
                },
                performed_actual: {
                    type: 'number',
                    name: 'Actual Presented'
                },
                user: {
                    type: 'string',
                    name: 'Person'
                }
            }
        },
        
        function (err, dataset) {
            if (err) {
                console.error(err);
                return;
            }

            dataset.put(
                [
                    { 
                        user: name, 
                        booked_target: metrics.sales.booked.target, 
                        booked_expected: metrics.sales.booked.expected, 
                        booked_actual: metrics.sales.booked[fname].actual,
                        performed_target: metrics.sales.performed.target,
                        performed_expected: metrics.sales.performed.expected,
                        performed_actual: metrics.sales.performed[fname].actual
                    }
                ],
                function (err) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    console.log('Dataset created and data added');
                }
            );
        }
    );
}

getData();
setInterval(getData, 300000);

const port = process.env.PORT || '3002';
app.set('port', port);

const server = http.createServer(app);
server.listen(port, () => console.log(`API running on localhost:${port}`));