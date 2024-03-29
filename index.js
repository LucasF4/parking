require('dotenv').config()

const express = require("express")
const path = require("path")
const app = express()
const knex = require('./Database/connection')
const bodyParser = require('body-parser')
const register = require('./controller/controll')
const master = require('./controller/mastercontroll')
const cliente = require('./controller/cliente')
const PORT = process.env.PORT || 7575
const auth = require('./middleware/auth.js')
const moment = require('moment')

const axios = require('axios')

const session = require('express-session')
const flash = require("express-flash")

//app.use(flash())

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 }
}))
app.use(flash())

app.use(express.static('public'))
app.use('/src', express.static(__dirname + 'public/src'))
app.set('views', path.join(__dirname + '/views'))
app.set('view engine', 'ejs')

app.use(bodyParser.urlencoded())
app.use(bodyParser.json())

app.use('/', register)
app.use('/', master)
app.use('/', cliente)

app.get('/login', (req, res) => {
    var erro = req.flash("erroLogin")
    var success = req.flash("success")
    success = (success == undefined || success.length == 0) ? undefined : success
    erro = (erro == undefined || erro.length == 0) ? undefined : erro
    res.render('login', { erro: erro, success: success })
})

app.get('/home', (req, res) => {
    console.log(req.session.user)
    res.render('home', { user: req.session.user })
})

app.get('/', auth, async (req, res) => {
    var db = req.session.user
    var today = moment().format('DD/MM/YYYY')
    var inf = await knex('users').where({ username: db })
    console.log(inf[0].cnpj)
    /* var error = req.flash("errorRegister")
    error = ( error == undefined || error.length == 0) ? undefined : error */
    var success = req.flash('success')
    var erro = req.flash('erroLogin')
    var expire = req.flash('expire')
    expire = (expire == undefined || expire.length == 0) ? undefined : expire
    success = (success == undefined || success.length == 0) ? undefined : success
    erro = (erro == undefined || erro.length == 0) ? undefined : erro
    await knex(db).select().whereNull("saida").orderBy('entrada', 'asc').then(select => {
        console.log(req.session)
        res.render('init', { today: today, vec: select, success: success, erro: erro, expire: expire, cnpj: inf[0].cnpj, user: req.session.user, phone: inf[0].phone, endereco: inf[0].address })
    })
        .catch(() => {
            var erro = `Algo deu errado, entre em contato com o desenvolvedor! Erro: 1002`
            req.flash('erroLogin', erro)
            res.redirect('/login')
        })
})

setInterval(async () => {
    await axios.get('https://systenparking.onrender.com/home', {
        headers: {
            "Content-Type": "application/json"
        }
    }).then(async resp => {
        console.log('ping systenparking.onrender.com')
    }).catch((e) => { console.log(e) })
}, 45000)

app.listen(PORT, () => {
    console.log("---> Servidor Iniciado! <---\nRodando na Porta: " + PORT)
})