/**
 * Mod: The Night Council
 *
 * Every villager gets a name, a temperament and a visible mark. At most one of
 * them is a murderer. While the murderer lives, one villager dies each night,
 * the village works slower out of fear, and the player has to work out who it
 * is from testimony, alibis and traces left at the scene. A sheriff (appointed
 * once a watchhouse stands) helps, but can be killed too.
 *
 * Rules and evidence labels for this mod live in MOD.md.
 */
var Mafia = {
	_DAYLIGHT: 3 * 60 * 1000,        // daylight in ms (hyper mode halves it)
	_NIGHT: 2 * 60 * 1000,           // night in ms. one full day is 5 minutes
	_TYPE_SPEED: 15,                 // ms per letter in dialog boxes
	_MURDERER_CHANCE: 0.1,           // chance any single arrival is the murderer
	_MIN_POP_TO_KILL: 4,             // the murderer waits until the village has this many people
	_MAX_SUSPECTS: 5,
	_CHECKS_PER_DAY: 1,              // alibi checks the player gets each day
	_SHERIFF_CHECKS_PER_DAY: 2,
	_KILLER_DENIED: 0.6,             // chance a false alibi is flatly denied (else 'not sure')
	_INNOCENT_CONFIRMED: 0.8,        // chance a true alibi is confirmed (else 'not sure')
	_CAUGHT_IN_ACT_CHANCE: 0.08,     // chance per murder that the player can catch them in the act
	_TRACKS_CHANCE: 0.35,            // chance the scene shows the murderer's mark
	_SLIP_CHANCE: 0.25,              // chance the murderer mentions how the victim died
	_SHERIFF_TARGET_CHANCE: 0.25,
	_SHERIFF_REVIEW_CHANCE: 0.5,     // chance a sheriff stops a wrongful stoning
	_FEAR_RATE: 0.8,                 // village income multiplier once killings start
	_FEAR_STEP: 0.1,                 // extra slowdown per innocent stoned
	_FEAR_FLOOR: 0.5,

	FIRST_NAMES: [
		'ada', 'bram', 'cora', 'dell', 'edda', 'finn', 'greta', 'hollis', 'ines', 'jory',
		'kasia', 'lem', 'maren', 'nils', 'odile', 'pell', 'quinn', 'rook', 'saoirse', 'tobin',
		'ulla', 'vesna', 'wren', 'yusuf', 'zola', 'anselm', 'bette', 'calder', 'dunya', 'elric',
		'fern', 'gideon', 'hester', 'ivo', 'juno', 'kit', 'lark', 'mabon', 'nell', 'orrin',
		'petra', 'rhys', 'sable', 'thea', 'uri', 'vale', 'willa', 'yara', 'amos', 'brisk'
	],
	LAST_NAMES: [
		'ash', 'barrow', 'coldwell', 'dunmore', 'elm', 'fallow', 'grey', 'hale', 'irons', 'juniper',
		'kettle', 'lowe', 'marsh', 'north', 'oakes', 'pike', 'quarry', 'reed', 'stone', 'thorne',
		'underhill', 'vane', 'wicker', 'yew', 'birch', 'crane', 'drift', 'frost', 'hearth', 'moss'
	],

	// each mark has how the villager looks, and what it leaves behind at a scene
	MARKS: [
		{ look: 'walks with a limp', trace: 'the footprints in the frost drag on one side.' },
		{ look: 'stands a head above everyone', trace: 'the footprints are long, the stride longer.' },
		{ look: 'favors the left hand', trace: 'the blow came from the left.' },
		{ look: 'wears a faded red scarf', trace: 'a red thread is caught on the door frame.' },
		{ look: 'wears iron-shod boots', trace: 'the prints are deep, with iron at the heel.' },
		{ look: 'is missing two fingers', trace: 'a bloody handprint on the wall has only three fingers.' },
		{ look: 'always smells of woodsmoke', trace: 'the hut still smells of smoke, though no fire was lit.' },
		{ look: 'wears a necklace of teeth', trace: 'a single drilled tooth lies by the body.' },
		{ look: 'goes barefoot, even in snow', trace: 'bare footprints lead away into the trees.' },
		{ look: 'has a bad cough', trace: 'the neighbours heard coughing outside, late.' }
	],

	// how the victim died. `verb` is what a guilty tongue lets slip.
	METHODS: [
		{ verb: 'take a hatchet to', detail: 'a hatchet wound, from behind.' },
		{ verb: 'strangle', detail: 'bruises at the throat, thin, like a cord.' },
		{ verb: 'stab', detail: 'one narrow wound, under the ribs.' },
		{ verb: 'crush', detail: 'the skull broken by a stone.' },
		{ verb: 'drown', detail: 'lungs full of water. the well bucket is overturned.' }
	],

	// voice lines. {p} partner, {pl} place, {o} other suspect, {v} victim, {m} method verb
	TRAITS: {
		'nervous': {
			alibi: 'i- i was at {pl} with {p}. all night. ask them.',
			alone: 'i was in my hut. alone. i know how that sounds.',
			remark: '{o} was out late. i heard the door. i don\'t want trouble.',
			accuse: 'it\'s {o}. it has to be. please don\'t tell them i said so.',
			grief: '{v}... i can\'t stop shaking.',
			slip: 'who would {m} {v} like that? i keep seeing it.'
		},
		'gruff': {
			alibi: '{pl}. with {p}. go ask.',
			alone: 'slept. alone. that\'s all.',
			remark: '{o} talks too much.',
			accuse: 'watch {o}.',
			grief: '{v} owed me fur. doesn\'t matter now.',
			slip: 'had to {m} {v} in the dark. coward\'s work.'
		},
		'cheerful': {
			alibi: 'oh, {p} and i were at {pl} half the night. they\'ll tell you.',
			alone: 'i turned in early. just me and the wind.',
			remark: '{o} seems kind. a bit quiet this week, maybe.',
			accuse: 'i hate to say it, but {o} hasn\'t smiled in days.',
			grief: '{v} always had a kind word. awful.',
			slip: 'to {m} {v}... i can\'t make it make sense.'
		},
		'suspicious': {
			alibi: 'i was at {pl} with {p}. why? what have you heard?',
			alone: 'in my hut, door barred. i bar it every night now.',
			remark: 'keep an eye on {o}. they watch everyone.',
			accuse: '{o}. i\'ve said so for days.',
			grief: '{v} knew something. that\'s why.',
			slip: 'someone got close enough to {m} {v} and nobody heard? someone\'s lying.'
		},
		'pious': {
			alibi: '{p} and i kept vigil at {pl}. the old ones saw us.',
			alone: 'i prayed alone. only the dark was listening.',
			remark: '{o} has not prayed with us in some time.',
			accuse: '{o} has something to answer for.',
			grief: '{v} is at rest now.',
			slip: 'may the dark forgive whoever would {m} {v}.'
		},
		'quiet': {
			alibi: '{pl}. {p} was there.',
			alone: '...my hut.',
			remark: '...{o} was awake.',
			accuse: '...{o}.',
			grief: '...',
			slip: '...to {m} {v}. no.'
		},
		'boastful': {
			alibi: 'i was at {pl}, doing twice {p}\'s work. ask them.',
			alone: 'alone. i don\'t need company to sleep.',
			remark: '{o}? couldn\'t lift an axe if they tried.',
			accuse: 'if i had to wager, {o}. i\'m never wrong.',
			grief: '{v} was almost as strong as me.',
			slip: 'you\'d need a strong arm to {m} {v}. not that i\'d know.'
		},
		'bitter': {
			alibi: 'at {pl} with {p}, freezing. same as every night.',
			alone: 'alone. like always.',
			remark: '{o} gets the best fur. funny, that.',
			accuse: '{o}. they never liked {v}.',
			grief: 'one fewer. more work for the rest.',
			slip: 'someone was going to {m} {v} sooner or later.'
		}
	},

	init: function() {
		if(Mafia._ready) return;
		Mafia._ready = true;
		var st = $SM.get('game.mafia');
		if(!st) {
			$SM.set('game.mafia', {
				day: 1,
				phase: 'day',
				nextId: 1,
				villagers: [],
				killer: null,
				sheriff: null,
				kills: 0,
				fear: Mafia._FEAR_RATE,
				caseFile: null,
				solved: 0
			}, true);
		}
		// villagers already living here before the mod loaded are all innocent
		Mafia.reconcile(true);
		$.Dispatch('stateUpdate').subscribe(Mafia.handleStateUpdates);
		if(!Mafia.state().phase) Mafia.state().phase = 'day';
		Mafia.applyPhase();
		Mafia.schedulePhase(true);
		Mafia.updateCouncilButton();
	},

	state: function() {
		return $SM.get('game.mafia');
	},

	save: function() {
		Engine.saveGame();
	},

	byId: function(id) {
		var vs = Mafia.state().villagers;
		for(var i = 0; i < vs.length; i++) {
			if(vs[i].id === id) return vs[i];
		}
		return null;
	},

	nameOf: function(id) {
		var c = Mafia.state().caseFile;
		var v = Mafia.byId(id) || (c && c.people && c.people[id]);
		return v ? v.name : 'someone';
	},

	pick: function(list) {
		return list[Math.floor(Math.random() * list.length)];
	},

	shuffle: function(list) {
		var a = list.slice();
		for(var i = a.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var t = a[i]; a[i] = a[j]; a[j] = t;
		}
		return a;
	},

	fill: function(line, vals) {
		return line.replace(/\{(\w+)\}/g, function(_m, k) {
			return typeof vals[k] != 'undefined' ? vals[k] : '';
		});
	},

	/* ---------- the roster ---------- */

	makeVillager: function() {
		var st = Mafia.state();
		var taken = {};
		st.villagers.forEach(function(v) { taken[v.name.split(' ')[0]] = true; });
		// first names stay unique while there are enough of them, so buttons can use them
		var free = Mafia.FIRST_NAMES.filter(function(n) { return !taken[n]; });
		var first = free.length ? Mafia.pick(free) : Mafia.pick(Mafia.FIRST_NAMES);
		var name = first + ' ' + Mafia.pick(Mafia.LAST_NAMES);
		var v = {
			id: st.nextId++,
			name: name,
			trait: Mafia.pick(Object.keys(Mafia.TRAITS)),
			mark: Math.floor(Math.random() * Mafia.MARKS.length),
			arrived: st.day
		};
		st.villagers.push(v);
		return v;
	},

	// keeps the named roster the same size as the population counter
	reconcile: function(noKiller) {
		var st = Mafia.state();
		var pop = $SM.get('game.population', true);
		while(st.villagers.length < pop) {
			var v = Mafia.makeVillager();
			if(!noKiller && st.killer === null && Math.random() < Mafia._MURDERER_CHANCE) {
				st.killer = v.id;
				Engine.log('a murderer has arrived');
			}
		}
		while(st.villagers.length > pop) {
			// deaths from fire, sickness and raids fall on ordinary villagers first
			var pool = st.villagers.filter(function(v) {
				return v.id !== st.killer && v.id !== st.sheriff;
			});
			if(pool.length === 0) pool = st.villagers.slice();
			var dead = Mafia.pick(pool);
			Mafia.removeVillager(dead.id);
		}
		Mafia.save();
	},

	removeVillager: function(id) {
		var st = Mafia.state();
		st.villagers = st.villagers.filter(function(v) { return v.id !== id; });
		if(st.sheriff === id) st.sheriff = null;
		if(st.killer === id) st.killer = null;
	},

	handleStateUpdates: function(e) {
		if(e.stateName && e.stateName.indexOf('game.population') === 0) {
			Mafia.reconcile(false);
		} else if(e.stateName && e.stateName.indexOf('game.buildings') === 0) {
			Mafia.updateCouncilButton();
		}
	},

	/* ---------- day and night ---------- */

	isNight: function() {
		var st = $SM.get('game.mafia');
		return !!st && st.phase === 'night';
	},

	// starts a fresh phase, or with `resume` picks up the saved one, so reloading can't reset the clock
	schedulePhase: function(resume) {
		clearTimeout(Mafia._phaseTimer);
		var st = Mafia.state();
		var now = Date.now();
		if(!resume || typeof st.phaseEndsAt != 'number') {
			var length = Mafia.isNight() ? Mafia._NIGHT : Mafia._DAYLIGHT;
			if(Engine.options.doubleTime) length /= 2;
			st.phaseEndsAt = now + length;
			Mafia.save();
		}
		// the end time is already in real ms, so skip hyper mode's halving here
		Mafia._phaseTimer = Engine.setTimeout(Mafia.advancePhase, Math.max(0, st.phaseEndsAt - now), true);
	},

	advancePhase: function() {
		if(Mafia.isNight()) {
			Mafia.dawn();
		} else {
			Mafia.dusk();
		}
		Mafia.save();
		Mafia.schedulePhase();
	},

	dusk: function() {
		Mafia.state().phase = 'night';
		Mafia.applyPhase();
		Notifications.notify(null, _('night falls. too dark to gather wood.'));
	},

	// the murderer strikes in the dark, so the body is found at dawn
	dawn: function() {
		var st = Mafia.state();
		st.phase = 'day';
		st.day++;
		Mafia.applyPhase();
		if(st.killer !== null && st.villagers.length >= Mafia._MIN_POP_TO_KILL) {
			Mafia.murder();
		} else {
			Notifications.notify(null, _('dawn. the village wakes.'));
		}
	},

	// sun or moon in the header, and no wood gathering at night
	applyPhase: function() {
		var night = Mafia.isNight();
		var gather = $('div#gatherButton');
		if(gather.length) Button.setDisabled(gather, night);
		var marker = $('div#dayPhase');
		if(!marker.length) {
			marker = $('<div>').attr('id', 'dayPhase').appendTo('div#header');
		}
		marker.empty();
		$('<span>').addClass('glyph').text(night ? '\u263E' : '\u2600').appendTo(marker);
		$('<span>').text((night ? _('night ') : _('day ')) + Mafia.state().day).appendTo(marker);
		marker.attr('title', night ? _('too dark to gather wood') : _('daylight'));
		$('body').toggleClass('night', night);
	},

	murder: function() {
		var st = Mafia.state();
		var killer = Mafia.byId(st.killer);
		var targets = st.villagers.filter(function(v) { return v.id !== st.killer; });
		var victim = Mafia.pick(targets);
		if(st.sheriff !== null && st.sheriff !== st.killer && Math.random() < Mafia._SHERIFF_TARGET_CHANCE) {
			victim = Mafia.byId(st.sheriff);
		}
		var wasSheriff = victim.id === st.sheriff;

		// the council was built from the old case; close it before the case changes under it
		if(Mafia._council && Events.activeEvent() === Mafia._council) {
			Events.endEvent();
		}

		var firstKill = st.kills === 0;
		st.kills++;
		Mafia.openCase(victim, killer);
		Mafia.removeVillager(victim.id);
		Outside.killVillagers(1);

		Notifications.notify(null, _('a body is found at dawn. ') + victim.name + _(' is dead.'));
		if(wasSheriff) {
			Notifications.notify(null, _('the sheriff is dead. the watchhouse stands empty.'));
		}
		if(firstKill) {
			Notifications.notify(null, _('the villagers are afraid. work slows.'));
		}
		Outside.updateVillageIncome();
		Mafia.updateCouncilButton();

		if(Math.random() < Mafia._CAUGHT_IN_ACT_CHANCE) {
			Mafia.caughtInTheAct(killer, victim);
		}
	},

	placesAvailable: function() {
		var places = ['the woodpile', 'the well', 'the fire'];
		var b = function(n) { return $SM.get('game.buildings["' + n + '"]', true) > 0; };
		if(b('trap')) places.push('the trap line');
		if(b('lodge')) places.push('the lodge');
		if(b('tannery')) places.push('the tannery');
		if(b('smokehouse')) places.push('the smokehouse');
		if(b('trading post')) places.push('the trading post');
		if(b('workshop')) places.push('the workshop');
		if(b('watchhouse')) places.push('the watchhouse');
		return places;
	},

	openCase: function(victim, killer) {
		var st = Mafia.state();
		var prev = st.caseFile ? st.caseFile.suspects : [];
		// a sheriff killed tonight can't help with this case
		var hasSheriff = st.sheriff !== null && st.sheriff !== victim.id;
		var pool = Mafia.shuffle(st.villagers.filter(function(v) {
			return v.id !== killer.id && v.id !== victim.id && v.id !== st.sheriff;
		}));

		// one innocent from last night returns, so a repeat face is not proof by itself
		var innocents = [];
		var repeat = pool.filter(function(v) { return prev.indexOf(v.id) >= 0; })[0];
		if(repeat) innocents.push(repeat);
		pool.forEach(function(v) {
			if(innocents.length < Mafia._MAX_SUSPECTS - 1 && prev.indexOf(v.id) < 0) innocents.push(v);
		});
		pool.forEach(function(v) {
			if(innocents.length < Mafia._MAX_SUSPECTS - 1 && innocents.indexOf(v) < 0) innocents.push(v);
		});
		var suspects = Mafia.shuffle(innocents.concat([killer]));
		var suspectIds = suspects.map(function(v) { return v.id; });
		var outsiders = Mafia.shuffle(pool.filter(function(v) { return suspectIds.indexOf(v.id) < 0; }));
		var places = Mafia.placesAvailable();

		// true alibis for the innocent
		var alibis = {};
		var loose = Mafia.shuffle(innocents);
		while(loose.length) {
			var a = loose.shift();
			var place = Mafia.pick(places);
			if(loose.length && Math.random() < 0.5) {
				var b2 = loose.shift();
				alibis[a.id] = { partner: b2.id, place: place };
				alibis[b2.id] = { partner: a.id, place: place };
			} else if(outsiders.length && Math.random() < 0.8) {
				alibis[a.id] = { partner: outsiders.shift().id, place: place };
			} else {
				alibis[a.id] = { partner: null, place: 'my hut' };
			}
		}

		// the killer's story
		var roll = Math.random();
		if(roll < 0.25 && innocents.length) {
			var named = Mafia.pick(innocents);
			alibis[killer.id] = { partner: named.id, place: Mafia.pick(places) };
		} else if(roll < 0.8 && outsiders.length) {
			alibis[killer.id] = { partner: outsiders.shift().id, place: Mafia.pick(places) };
		} else {
			alibis[killer.id] = { partner: null, place: 'my hut' };
		}

		var method = Mafia.pick(Mafia.METHODS);
		var loners = innocents.filter(function(v) { return alibis[v.id].partner === null; });

		// names are kept on the case so the file still reads after people die
		var people = {};
		st.villagers.forEach(function(v) {
			people[v.id] = { name: v.name, trait: v.trait, mark: v.mark };
		});

		// what each suspect says
		var testimony = {};
		suspects.forEach(function(s) {
			var voice = Mafia.TRAITS[s.trait];
			var al = alibis[s.id];
			var others = suspects.filter(function(o) { return o.id !== s.id; });
			var lines = [];
			var vals = { v: victim.name, m: method.verb };
			if(al.partner === null) {
				lines.push(Mafia.fill(voice.alone, vals));
			} else {
				vals.p = people[al.partner].name;
				vals.pl = al.place;
				lines.push(Mafia.fill(voice.alibi, vals));
			}
			var target;
			if(s.id === killer.id) {
				// deflect onto whoever looks worst
				target = loners.length ? Mafia.pick(loners) : Mafia.pick(others);
				vals.o = target ? target.name : victim.name;
				lines.push(Mafia.fill(voice.accuse, vals));
				lines.push(Mafia.fill(Math.random() < Mafia._SLIP_CHANCE ? voice.slip : voice.grief, vals));
			} else {
				target = Mafia.pick(others);
				vals.o = target.name;
				var accuses = s.trait === 'suspicious' || Math.random() < 0.3;
				lines.push(Mafia.fill(accuses ? voice.accuse : voice.remark, vals));
				lines.push(Mafia.fill(voice.grief, vals));
			}
			testimony[s.id] = lines;
		});

		var cleared = null;
		if(hasSheriff && innocents.length) {
			cleared = Mafia.pick(innocents).id;
		}

		st.caseFile = {
			day: st.day,
			victim: victim.id,
			method: method.detail,
			tracks: Math.random() < Mafia._TRACKS_CHANCE ? Mafia.MARKS[killer.mark].trace : null,
			hints: [],
			suspects: suspectIds,
			prevSuspects: prev,
			alibis: alibis,
			testimony: testimony,
			checks: {},
			checksLeft: hasSheriff ? Mafia._SHERIFF_CHECKS_PER_DAY : Mafia._CHECKS_PER_DAY,
			cleared: cleared,
			accused: null,
			people: people,
			watchUsed: false
		};
	},

	caughtInTheAct: function(killer, victim) {
		var canShow = Events.activeEvent() == null &&
			(Engine.activeModule == Outside || Engine.activeModule == Room);
		var trace = Mafia.MARKS[killer.mark].trace;
		if(!canShow) {
			Mafia.state().caseFile.hints.push(_('someone saw a figure leave the hut. they say ') + trace);
			Mafia.save();
			return;
		}
		Events.startEvent({
			title: _('A Scream in the Night'),
			scenes: {
				'start': {
					text: [
						_('a scream from the huts. you run.'),
						killer.name + _(' is standing over ') + victim.name + '.'
					],
					blink: true,
					decorate: Mafia.dialog(function() { return killer; }, true),
					buttons: {
						'mf_seize': {
							text: _('seize them'),
							nextScene: { 0.7: 'seized', 1: 'escaped' }
						},
						'mf_freeze': {
							text: _('call for help'),
							nextScene: { 1: 'escaped' }
						}
					}
				},
				'seized': {
					text: [],
					onLoad: function() {
						this.text = Mafia.execute(killer.id, true);
					},
					decorate: Mafia.dialog(null, true),
					buttons: {
						'mf_end': { text: _('go home'), nextScene: 'end' }
					}
				},
				'escaped': {
					text: [
						_('the figure is gone into the dark before anyone comes.'),
						trace
					],
					onLoad: function() {
						Mafia.state().caseFile.hints.push(_('you saw the killer run. ') + trace);
						Mafia.save();
					},
					decorate: Mafia.dialog(null, true),
					buttons: {
						'mf_end': { text: _('go home'), nextScene: 'end' }
					}
				}
			}
		});
	},

	/* ---------- justice ---------- */

	// runs a stoning. returns lines of text describing what happened.
	execute: function(id, inTheAct) {
		var st = Mafia.state();
		var c = st.caseFile;
		var name = Mafia.nameOf(id);
		if(!Mafia.byId(id)) {
			// a stale button: never let it cost a villager who wasn't chosen
			Engine.log('execute: ' + id + ' is not in the village');
			return [name + _(' is already gone.')];
		}
		if(c) c.accused = id;

		if(id === st.killer) {
			var fast = c && st.day - c.day < 2 && st.kills <= 2;
			var reward = Mafia.reward(fast);
			Mafia.removeVillager(id);
			st.killer = null;
			st.kills = 0;
			st.fear = Mafia._FEAR_RATE;
			st.solved++;
			st.caseFile = null;
			Outside.killVillagers(1);
			$SM.addM('stores', reward);
			Outside.updateVillageIncome();
			Mafia.updateCouncilButton();
			Mafia.save();
			Notifications.notify(null, _('the murderer is dead. the village breathes again.'));
			var lines = [
				inTheAct ? _('the villagers come running and hold them down.') :
					_('the villagers drag ') + name + _(' to the edge of the forest.'),
				_('the stones fall until they stop moving.'),
				_('under their bedding: a knife, and things taken from the dead. it was them.'),
				_('grateful families bring what they can spare.')
			];
			var got = [];
			for(var k in reward) got.push(reward[k] + ' ' + k);
			lines.push(got.join(', ') + '.');
			if(fast) lines.push(_('caught quickly. the village gives more than it can afford.'));
			return lines;
		}

		// an innocent
		var sheriff = st.sheriff !== null && st.sheriff !== st.killer ? Mafia.byId(st.sheriff) : null;
		if(sheriff && Math.random() < Mafia._SHERIFF_REVIEW_CHANCE) {
			Mafia.save();
			return [
				_('the village gathers stones.'),
				sheriff.name + _(', the sheriff, steps in front of ') + name + '.',
				_('"their story holds. i won\'t stone the wrong one."'),
				name + _(' goes free. the killer is still among you.')
			];
		}
		Mafia.removeVillager(id);
		Outside.killVillagers(1);
		st.fear = Math.max(Mafia._FEAR_FLOOR, Math.round((st.fear - Mafia._FEAR_STEP) * 100) / 100);
		Outside.updateVillageIncome();
		Mafia.save();
		Notifications.notify(null, name + _(' was innocent. the village knows it.'));
		return [
			_('the villagers drag ') + name + _(' to the edge of the forest.'),
			_('the stones fall until they stop moving.'),
			_('their hut holds nothing. no knife, no blood.'),
			name + _(' was innocent. fear settles deeper over the village.')
		];
	},

	reward: function(fast) {
		var mult = fast ? 1.5 : 1;
		var r = { 'wood': 300, 'fur': 100, 'meat': 100 };
		var extra = {
			'cured meat': 60, 'leather': 40, 'iron': 30, 'coal': 30,
			'steel': 15, 'sulphur': 15, 'bullets': 10, 'medicine': 3
		};
		for(var k in extra) {
			if(typeof $SM.get('stores["' + k + '"]') != 'undefined') r[k] = extra[k];
		}
		for(var j in r) r[j] = Math.ceil(r[j] * mult);
		return r;
	},

	// income multiplier used by Outside.updateVillageIncome
	workRate: function() {
		var st = $SM.get('game.mafia');
		if(!st || st.killer === null || st.kills === 0) return 1;
		return st.fear;
	},

	/* ---------- the council (player interface) ---------- */

	updateCouncilButton: function() {
		if(!$('div#outsidePanel').length) return;
		var st = Mafia.state();
		var show = (st && st.caseFile) || $SM.get('game.buildings["watchhouse"]', true) > 0;
		var btn = $('div#councilButton');
		if(show && btn.length === 0) {
			new Button.Button({
				id: 'councilButton',
				text: _('the council'),
				click: Mafia.openCouncil,
				width: '80px'
			}).appendTo('div#outsidePanel');
		} else if(!show && btn.length) {
			btn.remove();
		}
	},

	// short label for a button; falls back to the full name when first names clash
	label: function(id, ids) {
		var c = Mafia.state().caseFile;
		var first = c.people[id].name.split(' ')[0];
		var clash = ids.some(function(o) {
			return o !== id && c.people[o].name.split(' ')[0] === first;
		});
		return clash ? c.people[id].name : first;
	},

	suspectLine: function(id) {
		var c = Mafia.state().caseFile;
		var p = c.people[id];
		var line = p.name + ', ' + p.trait + ', ' + Mafia.MARKS[p.mark].look;
		if(c.prevSuspects.indexOf(id) >= 0) line += _('. seen near a body before');
		if(c.cleared === id) line += _('. the sheriff vouches for them');
		if(!Mafia.byId(id)) line += _('. dead');
		return line + '.';
	},

	openCouncil: function() {
		// the event system tracks one active scene, so never stack the council on another event
		if(Events.activeEvent() != null) return;
		var st = Mafia.state();
		var c = st.caseFile;
		var scenes = {};
		var startButtons = {};

		scenes['start'] = {
			text: [],
			onLoad: function() {
				var s = Mafia.state();
				var cf = s.caseFile;
				var t = [];
				if(!cf) {
					t.push(_('the village is quiet. nobody has been killed.'));
				} else {
					t.push(_('day ') + cf.day + '. ' + cf.people[cf.victim].name + _(' was found dead at dawn.'));
					t.push(_('the body: ') + cf.method + _(' the elders keep this quiet.'));
					t.push(cf.tracks ? cf.tracks : _('fresh snow covered whatever was there.'));
					cf.hints.forEach(function(h) { t.push(h); });
					t.push(_('seen near the hut that night:'));
					cf.suspects.forEach(function(id) { t.push('- ' + Mafia.suspectLine(id)); });
					t.push(_('alibis you can still chase today: ') + cf.checksLeft);
				}
				if(s.sheriff !== null) {
					t.push(_('sheriff: ') + Mafia.nameOf(s.sheriff));
				}
				this.text = t;
			},
			decorate: Mafia.dialog(null, false),
			buttons: startButtons
		};

		if(c) {
			c.suspects.forEach(function(id, i) {
				startButtons['mf_hear_' + i] = {
					text: _('hear ') + Mafia.label(id, c.suspects),
					nextScene: { 1: 'hear_' + i }
				};

				var hearButtons = {};
				hearButtons['mf_check_' + i] = {
					text: _('check alibi'),
					available: function() {
						var cf = Mafia.state().caseFile;
						return !!cf && cf.checksLeft > 0 && !cf.checks[id] && cf.alibis[id].partner !== null;
					},
					nextScene: { 1: 'check_' + i }
				};
				hearButtons['mf_back_' + i] = { text: _('back'), nextScene: { 1: 'start' } };
				scenes['hear_' + i] = {
					text: [],
					onLoad: function() {
						if(Mafia.isStale(c)) { this.text = [Mafia.STALE_TEXT]; return; }
						var cf = Mafia.state().caseFile;
						// the name is on the portrait already, so the first line starts at the temperament
						var t = [Mafia.suspectLine(id).slice(c.people[id].name.length + 2)];
						cf.testimony[id].forEach(function(l) { t.push('"' + l + '"'); });
						if(cf.checks[id]) t.push(cf.checks[id]);
						this.text = t;
					},
					decorate: Mafia.dialog(function() { return c.people[id]; }, true),
					buttons: hearButtons
				};

				var checkButtons = {};
				checkButtons['mf_cback_' + i] = { text: _('back'), nextScene: { 1: 'hear_' + i } };
				scenes['check_' + i] = {
					text: [],
					onLoad: function() {
						this.text = Mafia.isStale(c) ? [Mafia.STALE_TEXT] : [Mafia.checkAlibi(id)];
					},
					decorate: Mafia.dialog(function() { return c.people[c.alibis[id].partner]; }, true),
					buttons: checkButtons
				};

				var verdictButtons = {};
				verdictButtons['mf_vend_' + i] = { text: _('go home'), nextScene: 'end' };
				scenes['verdict_' + i] = {
					text: [],
					onLoad: function() {
						this.text = Mafia.isStale(c) ? [Mafia.STALE_TEXT] : Mafia.execute(id, false);
					},
					decorate: Mafia.dialog(function() { return c.people[id]; }, true),
					buttons: verdictButtons
				};
			});

			startButtons['mf_accuse'] = {
				text: _('accuse'),
				available: function() {
					var cf = Mafia.state().caseFile;
					return !!cf && cf.accused === null;
				},
				nextScene: { 1: 'accuse' }
			};

			var accuseButtons = {};
			c.suspects.forEach(function(id, i) {
				accuseButtons['mf_acc_' + i] = {
					text: Mafia.label(id, c.suspects),
					available: function() { return !!Mafia.byId(id); },
					nextScene: { 1: 'verdict_' + i }
				};
			});
			accuseButtons['mf_accback'] = { text: _('back'), nextScene: { 1: 'start' } };
			scenes['accuse'] = {
				text: [],
				onLoad: function() {
					var s = Mafia.state();
					this.text = [
						_('the village will gather stones once today. who do they take?'),
						s.sheriff !== null ?
							_('the sheriff will look over the case before anyone dies.') :
							_('there is no sheriff. your word is the law.')
					];
				},
				decorate: Mafia.dialog(null, false),
				buttons: accuseButtons
			};
		}

		if(Mafia.canAppoint()) {
			startButtons['mf_appoint'] = { text: _('appoint sheriff'), nextScene: { 1: 'appoint' } };
			var candidates = Mafia.shuffle(st.villagers).slice(0, 3);
			var appointButtons = {};
			candidates.forEach(function(v, i) {
				appointButtons['mf_app_' + i] = {
					text: v.name.split(' ')[0],
					onChoose: function() {
						Mafia.state().sheriff = v.id;
						Mafia.save();
						Notifications.notify(null, v.name + _(' takes the post at the watchhouse.'));
					},
					nextScene: 'end'
				};
			});
			appointButtons['mf_appback'] = { text: _('back'), nextScene: { 1: 'start' } };
			scenes['appoint'] = {
				text: candidates.map(function(v) {
					return v.name + ', ' + v.trait + ', ' + Mafia.MARKS[v.mark].look + '.';
				}).concat([_('who keeps the watch?')]),
				decorate: Mafia.dialog(null, false),
				buttons: appointButtons
			};
		}

		startButtons['mf_roster'] = { text: _('residents'), nextScene: { 1: 'roster' } };
		scenes['roster'] = {
			text: [],
			onLoad: function() {
				var names = Mafia.state().villagers.map(function(v) { return v.name; });
				var t = [names.length + _(' living in the village.')];
				for(var i = 0; i < names.length; i += 6) t.push(names.slice(i, i + 6).join(', '));
				this.text = t;
			},
			decorate: Mafia.dialog(null, false),
			buttons: { 'mf_rback': { text: _('back'), nextScene: { 1: 'start' } } }
		};

		startButtons['mf_leave'] = { text: _('leave'), nextScene: 'end' };

		Mafia._council = { title: _('The Council'), scenes: scenes };
		Events.startEvent(Mafia._council);
	},

	STALE_TEXT: _('a new day has come. open the council again.'),

	/* ---------- dialog boxes ---------- */

	// returns a scene `decorate` hook: retro frame, optional portrait and name, optional typing
	dialog: function(speaker, typewriter) {
		return function(desc) {
			desc.closest('.eventPanel').addClass('rpg');
			var person = speaker ? speaker() : null;
			if(person) {
				var box = $('<div>').addClass('rpgSpeaker');
				box.append(Portrait.draw(person, desc[0]));
				$('<div>').addClass('rpgName').text(person.name).appendTo(box);
				box.prependTo(desc);
			}
			if(typewriter) Mafia.typewrite(desc);
		};
	},

	// types the scene's lines out one letter at a time. a click shows everything.
	typewrite: function(desc) {
		var lines = desc.children('div').not('.rpgSpeaker');
		var full = lines.map(function() { return $(this).text(); }).get();
		var token = {};
		Mafia._typing = token;
		lines.text('');
		var li = 0, ci = 0;
		var finish = function() {
			if(Mafia._typing === token) Mafia._typing = null;
			lines.each(function(i) { $(this).text(full[i]); });
			desc.off('click.rpg');
			if(lines.length) $('<span>').addClass('rpgCursor').text(' \u25BC').appendTo(lines.last());
		};
		desc.off('click.rpg').on('click.rpg', finish);
		var step = function() {
			if(Mafia._typing !== token || !$.contains(document.documentElement, desc[0])) return;
			if(li >= lines.length) { finish(); return; }
			ci++;
			$(lines[li]).text(full[li].slice(0, ci));
			if(ci >= full[li].length) { li++; ci = 0; }
			setTimeout(step, Mafia._TYPE_SPEED);
		};
		step();
	},

	// true when the case a council panel was built from has since been replaced or closed
	isStale: function(c) {
		return !c || Mafia.state().caseFile !== c;
	},

	canAppoint: function() {
		var st = Mafia.state();
		return $SM.get('game.buildings["watchhouse"]', true) > 0 && st.sheriff === null && st.villagers.length > 0;
	},

	checkAlibi: function(id) {
		var st = Mafia.state();
		var c = st.caseFile;
		var al = c.alibis[id];
		var who = Mafia.nameOf(al.partner);
		var name = c.people[id].name;
		var r = Math.random();
		var result;
		if(!Mafia.byId(al.partner)) {
			result = who + _(' is dead. nobody can say.');
		} else if(id === st.killer) {
			result = r < Mafia._KILLER_DENIED ?
				who + _(' frowns. "') + name + _('? i never saw them that night."') :
				who + _(' isn\'t sure. "maybe. it was dark."');
		} else {
			result = r < Mafia._INNOCENT_CONFIRMED ?
				who + _(' nods. "') + name + _(' was with me. all night."') :
				who + _(' isn\'t sure. "maybe. it was dark."');
		}
		if(Mafia.byId(al.partner)) c.checksLeft--;
		c.checks[id] = _('alibi: ') + result;
		Mafia.save();
		return result;
	},

	/* ---------- for testers and agents ---------- */

	// Everything a player can see about the current case, and nothing else.
	// A playing agent reads this. It never reads `game.mafia` directly.
	observation: function() {
		var st = Mafia.state();
		var c = st.caseFile;
		if(!c) return { day: st.day, openCase: false };
		return {
			day: c.day,
			openCase: true,
			victim: c.people[c.victim].name,
			method: c.method,
			tracks: c.tracks,
			hints: c.hints.slice(),
			suspects: c.suspects.map(function(id) {
				return {
					line: Mafia.suspectLine(id),
					testimony: c.testimony[id].slice(),
					alibiCheck: c.checks[id] || null
				};
			}),
			checksLeft: c.checksLeft,
			accusedToday: c.accused !== null
		};
	},

	// console helper for playtests: run the rest of today and tonight, up to the next dawn
	debugNight: function() {
		if(!Mafia.isNight()) Mafia.dusk();
		Mafia.dawn();
		Mafia.save();
		Mafia.schedulePhase();
	}
};

/* an outside event: the night watch sometimes spots something */
Events.Outside.push({
	title: _('The Night Watch'),
	isAvailable: function() {
		var st = $SM.get('game.mafia');
		return Engine.activeModule == Outside && !!st && st.killer !== null && !!st.caseFile &&
			!st.caseFile.watchUsed && !!Mafia.byId(st.killer) && Math.random() < 0.5;
	},
	scenes: {
		'start': {
			text: [],
			onLoad: function() {
				var st = Mafia.state();
				var trace = Mafia.MARKS[Mafia.byId(st.killer).mark].trace;
				st.caseFile.watchUsed = true;
				st.caseFile.hints.push(_('the night watch saw someone. ') + trace);
				this.text = [
					_('a villager on the night watch comes to you, pale.'),
					_('"someone was out by the huts. i couldn\'t see a face."'),
					trace
				];
				Mafia.save();
			},
			notification: _('the night watch saw something'),
			decorate: Mafia.dialog(null, true),
			buttons: {
				'mf_watchend': { text: _('thank them'), nextScene: 'end' }
			}
		}
	}
});
