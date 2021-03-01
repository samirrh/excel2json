    var express = require('express'); 
    var app = express(); 
    var bodyParser = require('body-parser');
    var multer = require('multer');
    var xlstojson = require("xls-to-json-lc");
    var xlsxtojson = require("xlsx-to-json");
    var jsonToSend;
    
    //db
    require('dotenv').config();
    const mongoose = require('mongoose');

    mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true });
    const db = mongoose.connection;
    db.on('error', (error) => console.error(error));
    db.once('open', () => console.log('Connected to Database!'));
    const Parsed = require('./models/parsed');

    app.use(bodyParser.json());  

    //Set view engine to ejs
    app.set("view engine", "ejs"); 

    //Tell Express where we keep our ejs files
    app.set("views", __dirname + "/views"); 

    //Use body-parser
    app.use(bodyParser.urlencoded({ extended: false })); 

    //Render index.ejs
    app.get("/", (req, res) => { res.render("index"); });

    //multers disk storage settings
    var storage = multer.diskStorage({ 
        destination: function (req, file, cb) {
            cb(null, './uploads/')
        },
        filename: function (req, file, cb) {
            var datetimestamp = Date.now();
            cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
        }
    });

    //multer settings
    var upload = multer({ 
                    storage: storage,
                    fileFilter : function(req, file, callback) { //file filter
                        if (['xls', 'xlsx'].indexOf(file.originalname.split('.')[file.originalname.split('.').length-1]) === -1) {
                            return callback(new Error('Wrong extension type'));
                        }
                        callback(null, true);
                    }
                }).single('file');

    //API path that uploads file
    app.post('/upload', function(req, res) {
        var exceltojson;
        upload(req,res, function(err){
            if(err){
                 res.json({error_code:1,err_desc:err});
                 return;
            }
            // Multer gives file info in req.file object
            if(!req.file){
                res.json({error_code:1,err_desc:"No file passed"});
                return;
            }
            //filetype check
            if(req.file.originalname.split('.')[req.file.originalname.split('.').length-1] === 'xlsx'){
                exceltojson = xlsxtojson;
            } else {
                exceltojson = xlstojson;
            }
            console.log(req.file.path);
            try {
                exceltojson({
                    input: req.file.path,
                    //no output 
                    output: null, 
                    lowerCaseHeaders:true
                }, function(err,result){
                    if(err) {
                        return res.json({error_code:1,err_desc:err, data: null});
                    }
                    // global varibale with json data
                    jsonToSend = result;
                    res.render("send", { passedData: jsonToSend });
                });
            } catch (e){
                res.json({error_code:1,err_desc:"File Error - May be a corrupted file"});
            }
        })
    });

	// sending to db
    app.post('/sendtoDB', async (req, res) => {
        const parsed = new Parsed({
            info: jsonToSend
        })
        try {
            const newParsed = await parsed.save()
            res.render("sent", { message: "Added to MongoDB!" });
        } catch (err) {
            res.render("sent", { message: "Failed to add to MongoDB." });
        }
    })
    
    app.listen('3000', function(){
        console.log('running on 3000...');
    });