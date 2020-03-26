const express = require('express');
const app = express();
var path = require('path');
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var nbJoueur = 0;

var nbrCoupJoue = 0;
//Sauvegarde du dernier joueur
var lastPlayer = "";

//Matrice carré de 3x3 qui représentera notre grille
var matrix = Array(3).fill(null).map(() => Array(3).fill(0));

const mapJoueur = new Map();
const signe = new Map();
signe.set("X","<i class=\"far fa-circle fa-5x\" style=\"color:red;\"></i>");
signe.set("O","<i class=\"fas fa-times fa-5x\" style=\"color:blue;\"></i>");


app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.use(express.static(path.join(__dirname, 'src')))

function setMap(joueur){
	if(mapJoueur.size == 0)
		mapJoueur.set(joueur, 'X');
	else if(mapJoueur.size == 1)
		mapJoueur.set(joueur, 'O');
	else
		return;
}

function deplacementPossible(dep){
	var res = dep.split("_");
	if(matrix[res[0]][res[1]] === 0)
		return true;
	return false;
}

function setDeplacement(dep, joueur){
	var res = dep.split("_");
	matrix[res[0]][res[1]] = mapJoueur.get(joueur);
}

function joueurWin(joueur){
	var signe = mapJoueur.get(joueur);
	//Les lignes
	if(matrix[0][0] == signe && matrix[0][0] == matrix[0][1] && matrix[0][0] == matrix[0][2]) return true;
	if(matrix[1][0] == signe && matrix[1][0] == matrix[1][1] && matrix[1][0] == matrix[1][2]) return true;
	if(matrix[2][0] == signe && matrix[2][0] == matrix[2][1] && matrix[2][0] == matrix[2][2]) return true;

	//Les colonnes
	if(matrix[0][0] == signe && matrix[0][0] == matrix[1][0] && matrix[0][0] == matrix[2][0]) return true;
	if(matrix[0][1] == signe && matrix[0][1] == matrix[1][1] && matrix[0][1] == matrix[2][1]) return true;
	if(matrix[0][2] == signe && matrix[0][2] == matrix[1][2] && matrix[0][2] == matrix[2][2]) return true;

	//Les diagonales
	if(matrix[0][0] == signe && matrix[0][0] == matrix[1][1] && matrix[0][0] == matrix[2][2]) return true;
	if(matrix[0][2] == signe && matrix[0][2] == matrix[1][1] && matrix[0][2] == matrix[2][0]) return true;

	return false;
}

io.on('connection', function(socket){
	++nbJoueur;

	if(nbJoueur == 2){
		io.emit("can play",true);
	}else{
		io.emit("can play",false);
	}

	socket.on('disconnect', function(){
    	--nbJoueur;
    	if(nbJoueur < 2){
    		io.emit("can play",false);
    		//La partie est alors annulée
    		nbrCoupJoue = 0;
			lastPlayer = "";
			matrix = Array(3).fill(null).map(() => Array(3).fill(0));
			mapJoueur.clear();
			io.emit("restart game",true);
    	}
  	});

	socket.on('joueur joue',function(joueurDep){
		//On verifie que se ne soit pas le meme joueur qui rejoue
		if(lastPlayer != joueurDep.joueur){
			setMap(joueurDep.joueur);
			if(deplacementPossible(joueurDep.dep)){
				lastPlayer = joueurDep.joueur;
				setDeplacement(joueurDep.dep, joueurDep.joueur);
				++nbrCoupJoue;
				let succesObj  = {
					"dep" : joueurDep.dep,
					"forme" : signe.get(mapJoueur.get(joueurDep.joueur))
				};
				io.emit("succes dep", succesObj);

				if(nbrCoupJoue > 2 && joueurWin(joueurDep.joueur)){
					socket.emit('victory player', "You win !");
					socket.broadcast.emit('loose player', 'You loose !');
					io.emit("stop game", true);
				}else if(nbrCoupJoue == 9){
					io.emit('equals player', "Pas de gagnant..");
				}
			}else{
				socket.emit("erreur joueur", "Vous ne pouvez pas jouer ici !");
			}
		}else{
			socket.emit("erreur joueur", "Ce n'est pas votre tour !");
		}
		
	});

	socket.on("restart game",function(yes){
		nbrCoupJoue = 0;
		lastPlayer = "";
		matrix = Array(3).fill(null).map(() => Array(3).fill(0));
		mapJoueur.clear();
		io.emit("restart game",true);
	});
});


http.listen(3000, function(){
  console.log('listening on *:80');
});

//process.env.ALWAYSDATA_HTTPD_PORT, process.env.ALWAYSDATA_HTTPD_IP