/**
 * Module dependencies.
 */

process.on('uncaughtException', function (err) {
    console.log("Uncaught Exception", err)
});

var express = require('express')
    , routes = require('./routes/routes')
    , http = require('http')
    , https = require('https')
    , path = require('path')
    , ejs = require('ejs')
    , fs = require('fs')
    , experiment = ejs.render(fs.readFileSync("views/experiment.ejs", "utf-8"))
    , forwarder = require("./helpers/forwarder")
    , munchkin = require("./helpers/munchkin")
    , data = require("./helpers/data")
    , track_data = require("./helpers/track_data")
    , markdown = require("node-markdown").Markdown
    , calendar = require("./helpers/calendar")
    , contributors = require("./helpers/contributors")
    , versions = require("./helpers/versions")
    , channels = require("./helpers/channels")
    , spreadsheet = require("./helpers/spreadsheet")
    , content_loading = require("./helpers/content_loading")
    , meetup = require("./helpers/meetup")
    , page_handling = require("./helpers/page_handling")
    , paths = require("./helpers/path")
    , geoip = require("./helpers/geoip")
    , render = require("./helpers/render")
    , videos = require("./helpers/videos")
    , asset = require("./helpers/assets.js").asset;

var content = require("./helpers/content")
    , pages = require("./helpers/pages");

var app = express();

// data
// app.locals.chapters=content_data.chapters;
app.locals.apps = data.apps;
app.locals.books = data.books;
app.locals.pages = pages.pages;
app.locals.content = content.content;
// app.locals.contributors = data.contributors;
app.locals.contributors = {};
app.locals.drivers = data.drivers;
app.locals.ext_content = data.ext_content;
app.locals.trainings = data.trainings;
app.locals.units = track_data.units;

versions.load(app);

app.locals.events = [];
app.locals.paths = {};

// functions
app.locals.asset = asset;
app.locals._include = render.include;
app.locals.render = ejs.render;

page_handling.init(app,app.locals.pages);

app.locals.theme = function () {
    return "aqua";
};

// helper functions
app.locals.link_to = function (path, inner) {
    if (path) return "<a href=" + path + " " + (path.match("^http") ? ' target="_blank" ' : '') + ">" + inner + "</a>";
    return inner;
};

app.locals.chunk = function (arr, size) {
    var res = [];
    for (var i = 0; i < arr.length / size; i++) {
        res.push(arr.slice(i * size, (i + 1) * size));
    }
    return res;
};

function findItem(key) {
    // console.log("findItem", key)
    if (typeof key == 'function') key = key();
    if (typeof key == 'object') return key;
    
    function addType(item, type) {
        console.log(item,type);
        if (!item.type) item.type = type;
        return item;
    }
    if (pages.pages[key]) return addType(pages.pages[key], "page");
    if (content.content[key]) return addType(content.content[key], "content");
    if (content.content.drivers[key]) return addType(content.content.drivers[key], "driver");
    if (content.content.books[key]) return addType(content.content.books[key], "book");
    if (app.locals.contributors[key]) return addType(app.locals.contributors[key], "contributor");
    if (data.contributors[key]) return addType(data.contributors[key], "contributor");
    if (data.ext_content[key]) return addType(data.ext_content[key], "external");
    if (data.trainings[key]) return addType(data.trainings[key], "training");
    if (content.content.apps[key]) return addType(content.content.apps[key], "app");
    if (content.content.links[key]) return addType(content.content.drivers[key], "link");
    if (content.content.videos[key]) return addType(content.content.drivers[key], "video");
    return key;
}
app.locals.findItem = findItem;

app.locals.resolve_authors = function (authors) {
    if (!authors) return [];
    return [].concat(authors).filter(function (author) {
        return !!author
    }).map(function (author) {
        if (typeof(author) == 'object') author = author['name'];
        if (author.indexOf('@') == 0) author = author.substring(1);
        if (app.locals.contributors[author]) return app.locals.contributors[author];
        return { name:author, twitter:author.match(/\s/) ? "neo4j" : author };
    });
};

ejs.filters.md = function (b) {
    return markdown(b)
};

ejs.filters.wrap = function (content, tag) {
    return "<" + tag + ">" + content + "</" + tag + ">";
};

forwarder.add_console_forward(app, express, http);

videos.loadAllVideos(app.locals.pages,app.locals.content,4);

calendar.init(app,3600*1000);
channels.init(app,60*1000);
contributors.init(app,3600*1000);

// todo move somewhere else
app.locals({
    tutorial: {
        matrix: 'node:node_auto_index(id="603")',
        neo: 'node:node_auto_index(name="Keanu Reeves")',
        trinity: 'node:node_auto_index(name="Carrie-Anne Moss")',
        me: 'node:node_auto_index(name="Me")',
        friend: 'node:node_auto_index(name="A Friend")'
    }
});

content_loading.load_github_content(app.locals, 'puppet', "/neo4j-contrib/neo4j-puppet/master/README.md");
content_loading.load_github_content(app.locals, 'ec2_template', "/neo4j-contrib/neo4j-puppet/master/README.CLOUDFORMATION.md");
content_loading.load_learn_content(app.locals, 'java_hello_world', "/java-hello-world/index.html");
content_loading.load_learn_content(app.locals, 'java_cypher', "/java-cypher/index.html");

// paths TODO still needed ?
app.locals.paths.java = {
    java:{ steps:["learn_graph", "neo4j", "cypher", "java_cypher", "jvm_drivers", "java_basics", "server"],
        tags:["java"],
        related:[
            { title:"API Javadoc", url:"http://api.neo4j.org/current/", image:asset("img/languages/java.jpg") },
            { title:"Manual: Java Tutorial", url:"http://docs.neo4j.org/chunked/snapshot/tutorials-java-embedded.html", image:asset("img/languages/java.jpg") },
            { title:"Neo4j and last.fm", author:{ name:"Niklas Lindblad", twitter:"nlindblad", image:"https://d2tjdh98vh6jzp.cloudfront.net/wordpress/wp-content/uploads/498ab52745c50e9f5940f07e83bdde93.jpg" }, type:"video", url:"http://vimeo.com/39825129", image:"https://d2tjdh98vh6jzp.cloudfront.net/wordpress/wp-content/uploads/498ab52745c50e9f5940f07e83bdde93.jpg" }
        ] },


//  learn_graph : ["neo4j","java_basics" ],
//  neo4j : ["cypher","java_basics","server_basics"],
    jvm_drivers:{ steps:["ide", "java_basics", "java_cypher"], tags:["drivers", "jvm", "clojure", "scala", "java", "groovy"]},
    java_cypher:{ steps:["cypher", "jvm_drivers", "ide", "example_data"], tags:["cypher", "console", "shell"]},
    java_basics:{ steps:["java_cypher", "jvm_drivers", "ide", "example_data", "spring", "server", "server_extensions"], tags:["howto", "transaction", "graphdb", "shutdown", "index", "java"] }
};

app.locals.next_steps = function (path, page) {
    return paths.next_steps(app.locals, routes, path, page).map(function (step) {
        return "<li><a href='" + step.url + "'>" + step.opts.title + "</a></li>"
    }).join("\n")
};
app.locals.related = function (path, page) {
    return paths.related(app.locals, path, page);
};

/////// APP-CONFIG ///////

app.configure(function () {
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.enable('trust proxy');
    app.use(express.favicon());
    app.use(function (req, res, next) {
        res.locals.path = req.path;
        var experiment_pages = ['/', '/index', '/index_graph', '/index_graph_svg'];
        res.locals.index_page = experiment_pages.indexOf(req.path) != -1;
        res.locals.run_experiment = app.get('env') == 'production' && res.locals.index_page;
        next();
    });
    app.use(function (req, res, next) {
        try {
            res.locals.region = geoip.region(req.ip);
        } catch (e) {
            console.log("Error getting ip", req.ip, e);
            res.locals.region = 'US';
        }
        next();
    });
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser('value in relationships'));
    app.use(express.session());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});
app.configure('development', function () {
    app.use(express.errorHandler());
});

function forward(url) {
    return function (req, res) {
        res.redirect(url);
    }
}

function route_get(url, fun) {
    if (fun) fun.url = url;
    else console.log("Route missing for url: " + url);
    return app.get(url, fun);
}

/////// ROUTING ///////

route_get('/*/', function (req, res) {
    var path = req.path.substring(0, req.path.length - 1);
    res.redirect(path);
});

route_get('/', routes.index);
route_get('/favicon.ico', forward(asset('ico/favicon.ico')));

route_get('/drivers', forward("/develop/drivers"));
route_get('/learn/events', forward("/events"));

// TODO
route_get('/download_thanks', routes.pages);
route_get('/subscribe_thanks', routes.pages);
route_get('/participate/meetup_signup', routes.meetup_signup);
route_get('/participate/meetups', forward("http://neo4j.meetup.com/")); // TODO

route_get('/terms', routes.terms); // terms and conditions
route_get('/privacy', routes.privacy); // privacy policy
route_get('/release-notes', routes.release_notes); // TODO

// route_get('/misc/beer', routes.beer);

// well known historic URLs redirects
route_get('/getting-started', forward("/develop"));
route_get('/install', forward("/download"));
route_get('/tracks/java', forward("/develop/java"));
route_get('/java', forward("/develop/java"));
route_get('/tracks/cypher', forward("/tracks/cypher_track_start"));
route_get('/about', forward("/learn/neo4j"));
route_get('/ruby', forward("/learn/drivers"));

route_get('/community', forward("/participate"));
route_get('/community/feeds', forward("/participate")); //TODO
route_get('/resources', forward("/learn"));
route_get('/forums', forward("http://groups.google.com/group/neo4j"));
route_get('/nabble', forward("http://groups.google.com/group/neo4j"));
route_get('/spring', forward("/develop/spring"));
route_get('/heroku', forward("/develop/heroku"));
route_get('/azure', forward("http://blog.neo4j.org/2011/02/announcing-neo4j-on-windows-azure.html")); // TODO
route_get('/licensing-guide', forward("/learn/licensing"));
route_get('/bookstore', forward("/learn/books"));

route_get('/price-list', forward("http://www.neotechnology.com/price-list/"));
route_get('/customers', forward("http://www.neotechnology.com/customers/"));

munchkin.add_route('/marketo',app);
meetup.add_route("/meetup",app);
calendar.add_events_route('/events.json', app);

// download resources
route_get('/resources/cypher', forward(asset('download/Neo4j_CheatSheet_v3.pdf')));

route_get('/wp-content/*', routes.resource);
route_get('/wp-includes/*', routes.resource);
route_get('/assets/download/*', routes.resource);
route_get('/img/*', routes.resource);
route_get('/highlighter/*', routes.resource);


// todo redirect to our video content page
route_get('/video/*', function (req, res) {
    var path = req.path;
    var idx = path.lastIndexOf('/');
    var file = idx > -1 ? path.substr(idx + 1, path.length) : path;
    console.log('got request for ', path, ' from ', req.header('Referer'));
    res.redirect('http://watch.neo4j.org/video/' + file);
});

http.createServer(app).listen(app.get('port'), function () {
    console.log("Express server listening on port " + app.get('port'));
});
