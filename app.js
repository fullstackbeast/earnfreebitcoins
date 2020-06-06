const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const ejs = require('ejs');
const multer = require('multer');
const crypto = require('crypto');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const nodemailer = require("nodemailer");
const path = require('path');
const fs = require('fs')

const app = express();
let filename = '';
let gfs;

app.set('view engine', 'ejs');
app.use(express.static(path.resolve(__dirname, 'public')));
app.use(bodyParser.json());

dotenv.config({
    path: './config.env'
});

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);


// Check File Type
function checkFileType(file) {
    // Allowed ext
    const filetypes = /jpeg|jpg|png|gif/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    return (mimetype && extname);
}


const conn = mongoose.createConnection(DB);

mongoose.connect(DB, {
    useUnifiedTopology: true,
    useNewUrlParser: true
});

var db = mongoose.connection;

db.once("open", function () {

});

conn.once('open', () => {
    // Init stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('verifiers');
});

const storage = new GridFsStorage({
    url: DB,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            let mail = req.body.email
            let mailName = mail.substring(0, mail.indexOf('@'));
            filename = mailName + path.extname(file.originalname)
            const fileInfo = {
                filename: filename,
                bucketName: 'verifiers'
            };
            resolve(fileInfo);
        });
    }
});

const upload = multer({ storage });

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: [true, 'A user must have an email']
    },
    fullname: {
        type: String,
        required: [true, 'A user must have a name']
    },
    birthdate: {
        type: Date
    },
    phonenumber: {
        type: String,
        unique: true,
        required: [true, 'A user must have a phone number']
    },
    gender: {
        type: String,
        required: [true, 'A user must have a gender']
    },
    password: {
        type: String,
        required: [true, 'A user must have a password']
    }
});
const User = mongoose.model('User', userSchema);

const insertUser = (req, res) => {
    return new Promise((resolve, reject) => {
        const { email, fullname, birthdate, phonenumber, gender, password } = req.body;

        const formData = { email, fullname, birthdate, phonenumber, gender, password };

        const testUser = new User(formData);


        testUser.save().then((doc) => {
            resolve(doc.email)
        }).catch(err => {
            let errorMsg = err.errmsg;
            let errorCode = err.code;
            switch (errorCode) {
                case 11000:
                    let startIndex = errorMsg.indexOf('{') + 1;
                    let stopIndex = errorMsg.indexOf(':', startIndex);
                    let errorField = errorMsg.slice(startIndex, stopIndex).trim();
                    if (errorField == 'email') {
                        reject('A user already exist with this email');
                    }
                    else if (errorField == 'phonenumber') {
                        reject('A user already exist with this phone number');
                    }
                    break;
                default:
                    reject('An error occoured');
            }
        })

    })

}

const deleteDoc = (name) => {
    gfs.remove({ filename: name, root: 'verifiers' }, (err, gridStore) => {
        if (err) {
            return false
        }

        return true
    });
}

//routes
app.get('/', (req, res) => {
    res.render('index')
})

app.get('/register', (req, res) => res.render('index'));

app.post('/register', upload.single('verifydocument'), (req, res, ) => {
    let uploadedFileName = req.file.filename;
    if (req.file == undefined) {
        res.render('index', {
            msg: 'Error: No File Selected!',
            color: 'red'
        });
        deleteDoc(uploadedFileName)
    }
    else {
        if (checkFileType(req.file)) {
            insertUser(req, res).then((response) => {
                res.render('index', {
                    msg: 'User registered sucessfully!',
                    color: 'green'
                });
            }).catch(error => {
                res.render('index', {
                    msg: error,
                    color: 'red'
                });
                deleteDoc(uploadedFileName)
            })
        } else {
            res.render('index', {
                msg: 'Please upload image files only',
                color: 'red'
            });
            deleteDoc(uploadedFileName)
        }
    }

});

app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // Check if files
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: 'No files exist'
            });
        }

    });
});

app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      // Check if file
      if (!file || file.length === 0) {
        return res.status(404).json({
          err: 'No file exists'
        });
      }
  
      // Check if image
      if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
        // Read output to browser
        const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
      } else {
        res.status(404).json({
          err: 'Not an image'
        });
      }
    });
  });

app.listen(process.env.PORT || 3000);