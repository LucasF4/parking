const express = require("express")
const path = require("path")
const app = express()
const knex = require('./Database/connection')
const bodyParser = require('body-parser')
const register = require('./controller/controll')
const PORT = process.env.PORT || 7575

const flash = require("express-flash")

//app.use(flash())

app.set('views', path.join(__dirname + '/views'))
app.set('view engine', 'ejs')

app.use(bodyParser.urlencoded())
app.use(bodyParser.json())

app.use('/', register)

app.get('/', async (req, res) => {
    /* var error = req.flash("errorRegister")
    error = ( error == undefined || error.length == 0) ? undefined : error */
    var select = await knex('veicles').select().whereNull("saida")
    res.render('init', {vec: select})
})

app.listen(PORT, () => {
    console.log("---> Servidor Iniciado! <---\nRodando na Porta: " + PORT)
})