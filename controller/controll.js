const express = require('express')
const router = express.Router()
const moment = require('moment')
const knex = require('../Database/connection.js')

router.post('/register', async (req, res) => {
    var { plac } = req.body
    var now = moment().format('DD-MM-YYYY HH:mm:ss')
    console.log(`Placa: ${plac} and Time: ${now}`)

    var conferir = await knex.raw(`SELECT * FROM veicles WHERE placa = '${plac}' AND estadia is null`)
    console.log(conferir.rows)
    if(conferir.rows[0] == undefined){
        await knex.raw(`INSERT INTO veicles (placa, entrada, saida, estadia, preco) VALUES ('${plac}', now(), null, null, null) `)
        .then(() => {
            console.log('Inserido!')
            res.redirect('/')
        })
        .catch( err => console.log(err) )
    }else{
        res.send("Veículo já registrado")
    }
})

router.post('/payment', async (req, res) => {
    var { plac } = req.body;
    var preco = 0;

    console.log(`Placa: ${plac}`)
    var conferir = await knex('veicles').select().where({placa: plac}).andWhere({estadia: null})
    if(conferir[0] != undefined){

        await knex.raw(`SELECT *, now()::time, AGE(a.entrada, now()) FROM veicles a WHERE placa = '${plac}' AND  estadia is null`)
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
            
            if(parseInt(dias['_data']['hours'].toString().replace('-', '')) == 0 && parseInt(dias['_data']['minutes'].toString().replace('-', '')) < 30){
                preco = preco + 2;
                console.log('Preço é de ' + preco)
            }else if(parseInt(dias['_data']['hours'].toString().replace('-', '')) == 0 && parseInt(dias['_data']['minutes'].toString().replace('-', '')) >= 30){
                preco = preco + 4
                console.log('Preço é de ' + preco)
            }else{
                var i = 0;
                var k = 0;
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

                }while(i < parseInt(dias['_data']['minutes'].toString().replace('-', '')) || k < parseInt(dias['_data']['hours'].toString().replace('-', '')))
                console.log(k + ':' + i)
                console.log('Preço total: ' + preco)
                console.log(parseInt(dias['_data']['days'].toString()))
            }


            res.render('info', {placa: plac, info: resp.rows, dif: tempo, valor: preco.toString().includes('.') == true ? preco.toString().replace('.', ',') + '0' : preco.toString() + ',00'})
        })

        /* knex.raw(`UPDATE veicles SET saida = now() WHERE placa = '${plac}'`)
        .then(() => res.redirect('/'))
        .catch( err => console.log(err)) */
    }else{
        res.send('Veículo não Registrado')
    }
})

router.post('/fnsh', async (req, res) => {
    var { inputplaca, inputenter, inputexit, inputestadia, inputpay, inputdesc, inputpayT, cortesia } = req.body
    var inputCortesia;

    console.log(cortesia + '\n' + inputplaca + ' ' + inputenter + ' ' + inputexit + ' ' + inputestadia + ' ' + inputpay + ' ' + inputdesc + ' ' + inputpayT.replace(',', '.'))
    cortesia == undefined ? inputCortesia = null : inputCortesia = cortesia

    /* if(cortesia != null){
        inputpayT = '0,00'
    } */
    
    await knex.raw(`UPDATE veicles SET saida = '${inputexit}', estadia = '${inputestadia}', preco = ${inputpayT.replace(',', '.')}, desconto = ${inputdesc.replace(',', '.')}, descricao = '${inputCortesia}' WHERE placa = '${inputplaca}' AND estadia is null`)
    .then(() => {
        console.log('Pagamento realizado!')
        res.redirect('/')
    })
    .catch( err => console.log(err) )
})

router.get('/relatorio', async (req, res) => {
    var today = moment().startOf('month').format('YYYY-MM-DD')
    var ends = moment().endOf('month').format('YYYY-MM-DD')
    var veiculos = await knex.raw(`SELECT * FROM veicles WHERE entrada > '${today}' AND entrada < '${ends}' AND saida is not null`)
    var preco = await knex.raw(`SELECT sum(preco - desconto) FROM (SELECT * FROM veicles WHERE entrada > '${today}' AND entrada < '${ends}') a`)
    //var qnt = await knex.raw(`select count(*) from veicles WHERE estadia is not null`)
    //console.log(preco.rows[0]['sum'])
    //console.log(qnt.rows)
    var total = preco.rows[0]['sum']
    total = (total == undefined || total.length == 0) ? undefined : total
    res.render('relatorio', {veiculos: veiculos.rows, total: total, hoje: today, fim: ends})
})

router.get('/relat', async (req, res) => {

    //var initweek = moment().startOf('week').format('YYYY-MM-DD')
    var initweek = moment().subtract(6, 'days').format('YYYY-MM-DD')
    var today = moment().format('YYYY-MM-DD')

    var relat = await knex.raw(`SELECT SUM(preco - desconto), COUNT(*) as t, (ARRAY[
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
    ])[EXTRACT(MONTH FROM entrada)] as mes, extract(month from entrada) as data from veicles
    group by mes, data order by data asc`)

    var dif = await knex.raw(`SELECT extract(dow from entrada) as test, SUM(preco - desconto)
    FROM veicles WHERE CAST(entrada as date) >= '${initweek}' and CAST(entrada as date) <= '${today}' GROUP BY test`)

    res.json({relat: relat.rows, dif: dif.rows})
})

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