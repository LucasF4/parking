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
    var conferir = await knex('veicles').select().where({placa: plac})
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
                    if((i == 10 || i == 20 || i == 30 || i == 40 || i == 50 || i == 60) && k > 0){
                        preco = preco + 1.50
                    }
                    if(i == 60){
                        i = 0;
                        k++
                    }

                }while(i < parseInt(dias['_data']['minutes'].toString().replace('-', '')) || k < parseInt(dias['_data']['hours'].toString().replace('-', '')))
                console.log(k + ':' + i)
                console.log('Preço total: ' + preco)
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
    var { inputplaca, inputenter, inputexit, inputestadia, inputpay, inputdesc, inputpayT } = req.body

    console.log(inputplaca + ' ' + inputenter + ' ' + inputexit + ' ' + inputestadia + ' ' + inputpay + ' ' + inputdesc + ' ' + inputpayT.replace(',', '.'))
    await knex.raw(`UPDATE veicles SET saida = '${inputexit}', estadia = '${inputestadia}', preco = ${inputpayT.replace(',', '.')}, desconto = ${inputdesc.replace(',', '.')} WHERE placa = '${inputplaca}' AND estadia is null`)
    .then(() => {
        console.log('Pagamento realizado!')
        res.redirect('/')
    })
    .catch( err => console.log(err) )
})

router.get('/relatorio', async (req, res) => {
    res.render('')
})

module.exports = router