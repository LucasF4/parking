const express = require('express')
const flash = require('express-flash')
const router = express.Router()
const moment = require('moment')
const knex = require('../Database/connection.js')
const auth = require('../middleware/auth.js')
const bcrypt = require('bcrypt')

router.post('/login', async (req, res) => {
    var { email, password } = req.body
    var conf = await knex('users').select().where({username: email})
    var today = moment().format('YYYY-MM-DD')
    var fivedays = moment().subtract(5,'days').format('YYYY-MM-DD')

    if(conf[0] != undefined){
        var corret = bcrypt.compareSync(password, conf[0].senha)
        if(corret){
            if(conf[0].username == process.env.MM){
                req.session.user = conf[0].username
                res.redirect('/adm-master')
            }else{
                if(conf[0]['license'] == 'ilimitado' || conf[0]['license'] >= today){
                    console.log(conf[0]['license'] + ' -> ' + today + '->' + fivedays)
                    req.session.user = conf[0].username
                    req.session.expire = conf[0].license
                    expire = (conf[0].license == today) ? 'Sua licença encerra HOJE. Realize o Pagamento e entre em contato com o Desenvolvedor!' : undefined
                    
                    req.flash('expire', expire)
                    res.redirect('/')
                }else{
                    console.log(conf[0]['license'] + ' -> ' + today)
                    var erro = `Sua Licença Expirou.\nVeja nossas ofertas  e entre em contato com o Desenvolvedor.`
                    req.flash('erroLogin', erro)
                    res.redirect('/login')
                }
            }
        }else{
            var erro = `Credenciais Incorretas`
            req.flash('erroLogin', erro)
            res.redirect('/login')
        }
        
    }else{
        var erro = `Credenciais Incorretas`
        req.flash('erroLogin', erro)
        res.redirect('/login')
    }
})

router.post('/register', auth, async (req, res) => {
    var { plac } = req.body
    if(plac.length < 8){
        var error = `Os dados que você tentou inserir estão incorretos.`;
        req.flash('erroLogin', error)
        res.redirect('/')
        return;
    }
    var db = req.session.user
    var now = moment().format('DD-MM-YYYY HH:mm:ss')
    console.log(`Placa: ${plac} and Time: ${now}`)

    var conferir = await knex.raw(`SELECT * FROM ${db} WHERE placa = '${plac}' AND estadia is null`)
    console.log(conferir.rows)
    if(conferir.rows[0] == undefined){
        await knex.raw(`INSERT INTO ${db} (placa, entrada, saida, estadia, preco) VALUES ('${plac}', now(), null, null, null) `)
        .then(() => {
            console.log('Inserido!')
            var success = `Inserido com sucesso`
            req.flash('success', success)
            res.redirect('/')
        })
        .catch( err => console.log(err) )
    }else{
        var erro = `Veículo já registrado`
        req.flash('erroLogin', erro)
        res.redirect('/')
    }
})

router.post('/payment', auth, async (req, res) => {
    var { plac } = req.body;
    var db = req.session.user
    var preco = 0;

    console.log(`Placa: ${plac}`)
    var conferir = await knex(db).select().where({placa: plac}).andWhere({estadia: null})
    if(conferir[0] != undefined){

        await knex.raw(`SELECT *, now()::time, AGE(a.entrada, now()) FROM ${db} a WHERE placa = '${plac}' AND  estadia is null`)
        .then( resp => {

            if(resp.rows[0]['estadia'] != null){
                res.send('Veículo informado já saiu, faça um novo registro')
                return;
            }

            console.log( resp.rows )
            var diff = moment(resp.rows[0]['entrada'], 'HH:mm:ss').diff(moment(resp.rows[0]['now'], 'HH:mm:ss'))
            var dias = moment.duration(diff)
            
            var tempo = (parseInt(dias['_data']['hours'].toString().replace('-', '')) <= 9 ? '0' + parseInt(dias['_data']['hours'].toString().replace('-', '')) : parseInt(dias['_data']['hours'].toString().replace('-', ''))) + ':' +(parseInt(dias['_data']['minutes'].toString().replace('-', '')) <= 9 ? '0' + parseInt(dias['_data']['minutes'].toString().replace('-', '')) : parseInt(dias['_data']['minutes'].toString().replace('-', ''))) + ':' + (parseInt(dias['_data']['seconds'].toString().replace('-', '')) <= 9 ? '0' + parseInt(dias['_data']['seconds'].toString().replace('-', '')) : parseInt(dias['_data']['seconds'].toString().replace('-', '')))
            console.log(tempo)
            
            if(parseInt(dias['_data']['hours'].toString().replace('-', '')) == 0 && parseInt(dias['_data']['minutes'].toString().replace('-', '')) < 30 && parseInt(dias['_data']['days'].toString().replace('-', '')) == 0){
                preco = 2;
                console.log('Preço é de ' + preco)
            }else if(parseInt(dias['_data']['hours'].toString().replace('-', '')) == 0 && parseInt(dias['_data']['minutes'].toString().replace('-', '')) >= 30 && parseInt(dias['_data']['days'].toString().replace('-', '')) == 0){
                preco = 4
                console.log('Preço é de ' + preco)
            }else{
                var i = 0;
                var k = 0;
                var j = 0;
                preco = 4;

                do{
                    i++
                    if((i == 15 || i == 30 || i == 45 || i == 60) && k > 0){
                        preco = preco + 1.50
                    }
                    if(i == 60){
                        i = 0;
                        k++
                    }
                    if(k == 24){
                        k = 0;
                        j++
                    }

                }while(i < parseInt(dias['_data']['minutes'].toString().replace('-', '')) || k < parseInt(dias['_data']['hours'].toString().replace('-', '')) || j < parseInt(dias['_data']['days'].toString().replace('-', '')))
                //|| j < parseInt(dias['_data']['days'].toString().replace('-', ''))
                console.log(j + ':' + k + ':' + i)
                //console.log('-----------> ' + j)
                console.log('Preço total: ' + preco)
                //console.log(parseInt(dias['_data']['days'].toString()))
            }


            res.render('info', {day: j, placa: plac, info: resp.rows, dif: tempo, valor: preco.toString().includes('.') == true ? preco.toString().replace('.', ',') + '0' : preco.toString() + ',00'})
        })

        /* knex.raw(`UPDATE veicles SET saida = now() WHERE placa = '${plac}'`)
        .then(() => res.redirect('/'))
        .catch( err => console.log(err)) */
    }else{
        var erro = `Veículo não registrado!`
        req.flash('erroLogin', erro)
        res.redirect('/')
    }
})

router.post('/fnsh', auth, async (req, res) => {
    var { inputplaca, inputenter, inputexit, inputestadia, inputpay, inputdesc, inputpayT, cortesia, formpag } = req.body
    var inputCortesia;
    var db = req.session.user

    console.log(cortesia + '\n' + inputplaca + ' ' + inputenter + ' ' + inputexit + ' ' + inputestadia + ' ' + inputpay + ' ' + inputdesc + ' ' + inputpayT.replace(',', '.') + ' ' + formpag)
    cortesia == undefined ? inputCortesia = null : inputCortesia = cortesia

    /* if(cortesia != null){
        inputpayT = '0,00'
    } */
    
    await knex.raw(`UPDATE ${db} SET saida = '${inputexit}', estadia = '${inputestadia}', preco = ${inputpayT.replace(',', '.')}, desconto = ${inputdesc.replace(',', '.')}, descricao = '${inputCortesia}', formpag = '${formpag}' WHERE placa = '${inputplaca}' AND estadia is null`)
    .then(() => {
        console.log('Pagamento realizado!')
        var success = `Registro Finalizado e Pagamento Efetuado!`
        req.flash('success', success)
        res.redirect('/')
    })
    .catch( err => console.log(err) )
})

router.get('/relatorio', auth, async (req, res) => {
    var today = moment().format('DD/MM/YYYY')
    var ends = moment().endOf('month').format('YYYY-MM-DD')
    var hoje = moment().format('YYYY-MM-DD')
    var db = req.session.user

    var percpag = await knex.raw(`SELECT formpag, COUNT(*) as formpagD FROM ${db} WHERE CAST(entrada as DATE) = '${hoje}' AND formpag is not null GROUP BY formpag`)
    var all = await knex.raw(`SELECT COUNT(*) as all FROM ${db} WHERE formpag is not null AND CAST(entrada as DATE) = '${hoje}'`)
    //var veiculos = await knex.raw(`SELECT * FROM ${db} WHERE entrada > '${today}' AND entrada < '${ends}' AND saida is not null`)
    var veiculos = await knex.raw(`SELECT * FROM ${db} WHERE CAST(entrada as date) = '${hoje}' and saida is not null ORDER BY id ASC`)
    //var preco = await knex.raw(`SELECT sum(preco - desconto) FROM (SELECT * FROM ${db} WHERE entrada > '${today}' AND entrada < '${ends}') a`)
    var preco = await knex.raw(`SELECT sum(preco - desconto) FROM (SELECT * FROM ${db} WHERE CAST(entrada as date) = '${hoje}' and saida is not null) a`)
    //var qnt = await knex.raw(`select count(*) from ${db} WHERE estadia is not null`)
    //console.log(preco.rows[0]['sum'])
    //console.log(qnt.rows)
    var total = preco.rows[0]['sum']
    total = (total == undefined || total.length == 0 || total == null) ? '0.00' : total
    res.render('relatorio', {veiculos: veiculos.rows, total: total, hoje: today, fim: ends, today: hoje, percent: percpag.rows, all: all.rows[0]['all']})
})

router.get('/relat', auth, async (req, res) => {
    var db = req.session.user
    //var initweek = moment().startOf('week').format('YYYY-MM-DD')
    var initweek = moment().subtract(6, 'days').format('YYYY-MM-DD')
    var today = moment().format('YYYY-MM-DD')
    var user = req.session.user

    await knex.raw(`SELECT SUM(preco - desconto), COUNT(*) as t, (ARRAY[
        'Jan',
        'Fev',
        'Mar',
        'Abr',
        'Mai',
        'Jun',
        'Jul',
        'Ago',
        'Set',
        'Out',
        'Nov',
        'Dez'
    ])[EXTRACT(MONTH FROM entrada)] as mes, extract(month from entrada) as data from ${db}
    group by mes, data order by data asc`)
    .then(async relat => {
        var dif = await knex.raw(`SELECT extract(dow from entrada) as test, SUM(preco - desconto)
        FROM ${db} WHERE CAST(entrada as date) >= '${initweek}' and CAST(entrada as date) <= '${today}' GROUP BY test`)

        var day = await knex.raw(`SELECT SUM(${db}.preco - ${db}.desconto)
            FROM ${db} WHERE CAST(${db}.entrada as date) = '${today}'`)

        var meta = await knex('users').select().where({username: user})

        res.json({relat: relat.rows, dif: dif.rows, today: day.rows, meta: meta[0]['meta']})
    })
    .catch(err => {
        console.log(err)
        res.redirect('/login')
    })
    
})

router.get('/aboutme', auth, async (req, res) => {
    var user = req.session.user;
    var perm = await knex('users').select().where({username: user})
    //console.log(perm)
    if(perm[0] != undefined){
        res.render('dataperson', {perm: perm[0]})
    }else{
        res.redirect('/login')
    }
})

router.get('/editPerson', auth, (req, res) => {
    var maintenance = '0';
    if(maintenance == '1'){
        res.render('erros/404')
    }else{
        res.render('editPerson')
    }
})

router.get('/contact', (req, res) => {
    res.render('contact')
})

router.post('/uploadInfo', auth, async (req, res) => {
    var { meta } = req.body
    var meta1 = meta.replace(',', '.')
    var user = req.session.user
    console.log(meta + ' ' + user)

    await knex.raw(`UPDATE users SET meta = '${meta1}' WHERE username = '${user}'`)
    .then( () => {
        console.log('Dados atualizados')
        res.redirect('/aboutme')
    })
    .catch( err => { 
        console.log(err)
        res.send('Error: 1005')
    })
})

router.get('/logout', (req, res) => {
    req.session.user = undefined;
    var erro = `Sessão Encerrada`
    req.flash("erroLogin", erro)
    res.redirect('/login')
})

/* -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- */

/* router.post('/create_preference', (req, res) => {

}) */

/* router.post('/relatorio', async (req, res) => {
    var { hoje, fim } = req.body
    console.log(`${hoje}\n${fim}`)

    if(hoje != fim){

        var veiculos = await knex.raw(`SELECT * FROM veicles WHERE entrada > '${hoje}' AND entrada < '${fim}' AND saida is not null`)
        var preco = await knex.raw(`SELECT sum(preco) FROM (SELECT * FROM veicles WHERE entrada > '${hoje}' AND entrada < '${fim}') a`)
        
        console.log(veiculos.rows)
        console.log(preco.rows[0])
    }else{
        var veiculos = await knex.raw(`SELECT * FROM veicles WHERE (CAST(entrada AS DATE) = '${hoje}' AND saida is not null)`)
        var preco = await knex.raw(`SELECT sum(preco) FROM (SELECT * FROM veicles WHERE (CAST(entrada AS DATE) = '${hoje}' AND saida is not null)) a`)
        console.log(veiculos.rows)
        console.log(preco.rows)
    }

    res.json({veiculos: veiculos, preco: preco})
}) */

module.exports = router