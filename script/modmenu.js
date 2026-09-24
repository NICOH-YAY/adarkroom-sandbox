/**
 * Sandbox build only: a mod menu for tuning The Night Council during playtests.
 * It is not part of the submitted game. Settings persist in this browser.
 *
 * Opens from "mod menu." in the bottom menu bar.
 */
var ModMenu = {
	STORAGE_KEY: 'nightCouncilModMenu',

	// obj/key: the live constant to change. unit converts the shown value to the stored one.
	SETTINGS: [
		{ group: 'time' },
		{ obj: 'Button', key: 'COOLDOWN_SCALE', label: 'button cooldown scale', step: 0.05, min: 0.05 },
		{ obj: 'Mafia', key: '_DAYLIGHT', label: 'daylight (seconds)', unit: 1000, step: 10, min: 5 },
		{ obj: 'Mafia', key: '_NIGHT', label: 'night (seconds)', unit: 1000, step: 10, min: 5 },
		{ obj: 'Mafia', key: '_TYPE_SPEED', label: 'typing (ms per letter)', step: 5, min: 0 },
		{ group: 'the murderer' },
		{ obj: 'Mafia', key: '_MURDERER_CHANCE', label: 'chance per arrival', step: 0.05, min: 0, max: 1 },
		{ obj: 'Mafia', key: '_MIN_POP_TO_KILL', label: 'village size before killing', step: 1, min: 2 },
		{ obj: 'Mafia', key: '_CAUGHT_IN_ACT_CHANCE', label: 'caught in the act', step: 0.05, min: 0, max: 1 },
		{ obj: 'Mafia', key: '_SHERIFF_TARGET_CHANCE', label: 'targets the sheriff', step: 0.05, min: 0, max: 1 },
		{ group: 'evidence' },
		{ obj: 'Mafia', key: '_TRACKS_CHANCE', label: 'scene shows their mark', step: 0.05, min: 0, max: 1 },
		{ obj: 'Mafia', key: '_SLIP_CHANCE', label: 'they name the cause of death', step: 0.05, min: 0, max: 1 },
		{ obj: 'Mafia', key: '_KILLER_DENIED', label: 'false alibi denied', step: 0.05, min: 0, max: 1 },
		{ obj: 'Mafia', key: '_INNOCENT_CONFIRMED', label: 'true alibi confirmed', step: 0.05, min: 0, max: 1 },
		{ obj: 'Mafia', key: '_CHECKS_PER_DAY', label: 'alibi checks per day', step: 1, min: 0 },
		{ obj: 'Mafia', key: '_SHERIFF_CHECKS_PER_DAY', label: 'checks with a sheriff', step: 1, min: 0 },
		{ obj: 'Mafia', key: '_SHERIFF_REVIEW_CHANCE', label: 'sheriff stops a wrong stoning', step: 0.05, min: 0, max: 1 },
		{ group: 'fear' },
		{ obj: 'Mafia', key: '_FEAR_RATE', label: 'income while afraid', step: 0.05, min: 0, max: 1 },
		{ obj: 'Mafia', key: '_FEAR_STEP', label: 'drop per innocent stoned', step: 0.05, min: 0, max: 1 },
		{ obj: 'Mafia', key: '_FEAR_FLOOR', label: 'lowest income', step: 0.05, min: 0, max: 1 }
	],

	defaults: {},

	target: function(s) {
		return window[s.obj];
	},

	id: function(s) {
		return s.obj + '.' + s.key;
	},

	setting: function(id) {
		return ModMenu.SETTINGS.filter(function(s) { return s.key && ModMenu.id(s) === id; })[0];
	},

	// shown value, e.g. 180 seconds for a stored 180000 ms
	shown: function(s) {
		return ModMenu.target(s)[s.key] / (s.unit || 1);
	},

	// runs at load, before the game starts, so saved settings apply from the first tick
	init: function() {
		ModMenu.SETTINGS.forEach(function(s) {
			if(s.key) ModMenu.defaults[ModMenu.id(s)] = ModMenu.target(s)[s.key];
		});
		var saved = null;
		try {
			saved = JSON.parse(localStorage.getItem(ModMenu.STORAGE_KEY));
		} catch(e) {
			saved = null;
		}
		if(saved) ModMenu.setAll(saved);
	},

	// values: { 'Mafia._NIGHT': 120000, ... } in stored units
	setAll: function(values) {
		ModMenu.SETTINGS.forEach(function(s) {
			var v = values[ModMenu.id(s)];
			if(s.key && typeof v == 'number' && !isNaN(v)) ModMenu.target(s)[s.key] = v;
		});
	},

	save: function() {
		var values = {};
		ModMenu.SETTINGS.forEach(function(s) {
			if(s.key) values[ModMenu.id(s)] = ModMenu.target(s)[s.key];
		});
		try {
			localStorage.setItem(ModMenu.STORAGE_KEY, JSON.stringify(values));
		} catch(e) {
			Engine.log('mod menu: could not save settings');
		}
	},

	apply: function() {
		var values = {};
		$('#modMenu input[data-id]').each(function() {
			var s = ModMenu.setting($(this).attr('data-id'));
			var v = parseFloat($(this).val());
			if(!s || isNaN(v)) return;
			if(typeof s.min == 'number') v = Math.max(s.min, v);
			if(typeof s.max == 'number') v = Math.min(s.max, v);
			values[ModMenu.id(s)] = v * (s.unit || 1);
		});
		ModMenu.setAll(values);
		ModMenu.save();
		ModMenu.refreshLive();
		ModMenu.render();
		ModMenu.say('saved. phase timer restarted.');
	},

	reset: function() {
		ModMenu.setAll(ModMenu.defaults);
		try {
			localStorage.removeItem(ModMenu.STORAGE_KEY);
		} catch(e) {}
		ModMenu.refreshLive();
		ModMenu.render();
		ModMenu.say('back to the defaults.');
	},

	// push changed timings into the running game
	refreshLive: function() {
		if(typeof Mafia != 'undefined' && Mafia._ready) {
			Mafia.schedulePhase();
			Outside.updateVillageIncome();
		}
	},

	/* ---------- cheats for playtesting ---------- */

	ready: function() {
		if(typeof Mafia == 'undefined' || !Mafia._ready) {
			ModMenu.say('go outside first. the village has to exist.');
			return false;
		}
		return true;
	},

	nextPhase: function() {
		if(!ModMenu.ready()) return;
		Mafia.advancePhase();
		ModMenu.say(Mafia.isNight() ? 'it is night.' : 'it is day ' + Mafia.state().day + '.');
	},

	plantMurderer: function() {
		if(!ModMenu.ready()) return;
		var st = Mafia.state();
		if(st.killer !== null) {
			ModMenu.say('there is already a murderer.');
		} else if(st.villagers.length === 0) {
			ModMenu.say('nobody lives here yet.');
		} else {
			st.killer = Mafia.pick(st.villagers).id;
			Mafia.save();
			ModMenu.say('someone in the village is now a murderer.');
		}
	},

	reveal: function() {
		if(!ModMenu.ready()) return;
		var st = Mafia.state();
		ModMenu.say(st.killer === null ? 'no murderer in the village.' : 'the murderer is ' + Mafia.nameOf(st.killer) + '.');
	},

	fillVillage: function() {
		if(!ModMenu.ready()) return;
		var room = Outside.getMaxPopulation() - $SM.get('game.population', true);
		if(room <= 0) {
			ModMenu.say('the huts are full. build more.');
			return;
		}
		$SM.add('game.population', room);
		ModMenu.say(room + ' villagers arrive.');
	},

	giveWood: function() {
		$SM.add('stores.wood', 500);
		ModMenu.say('500 wood added.');
	},

	/* ---------- panel ---------- */

	say: function(msg) {
		$('#modMenu .modMsg').text(msg);
	},

	toggle: function() {
		if($('#modMenu').length) {
			$('#modMenu').remove();
		} else {
			ModMenu.render();
		}
	},

	render: function() {
		$('#modMenu').remove();
		var panel = $('<div>').attr('id', 'modMenu').appendTo('body');
		// the engine blocks mousedown and arrow keys page-wide; keep the inputs usable
		panel.on('mousedown keydown keyup', function(e) { e.stopPropagation(); });

		$('<div>').addClass('modTitle').text('mod menu (sandbox)').appendTo(panel);
		var list = $('<div>').addClass('modList').appendTo(panel);
		ModMenu.SETTINGS.forEach(function(s) {
			if(s.group) {
				$('<div>').addClass('modGroup').text(s.group).appendTo(list);
				return;
			}
			var row = $('<label>').addClass('modRow').appendTo(list);
			$('<span>').text(s.label).appendTo(row);
			var input = $('<input>').attr({
				type: 'number',
				step: s.step,
				'data-id': ModMenu.id(s)
			}).val(+ModMenu.shown(s).toFixed(3)).appendTo(row);
			if(typeof s.min == 'number') input.attr('min', s.min);
			if(typeof s.max == 'number') input.attr('max', s.max);
			if(ModMenu.target(s)[s.key] !== ModMenu.defaults[ModMenu.id(s)]) row.addClass('changed');
		});

		var actions = [
			['apply', ModMenu.apply], ['defaults', ModMenu.reset], ['close', ModMenu.toggle],
			['next phase', ModMenu.nextPhase], ['plant murderer', ModMenu.plantMurderer],
			['reveal murderer', ModMenu.reveal], ['fill huts', ModMenu.fillVillage], ['+500 wood', ModMenu.giveWood]
		];
		var bar = $('<div>').addClass('modActions').appendTo(panel);
		actions.forEach(function(a) {
			$('<span>').addClass('modBtn').text(a[0]).click(a[1]).appendTo(bar);
		});
		$('<div>').addClass('modMsg').appendTo(panel);
	},

	STYLE: [
		'#modMenu { position: fixed; top: 20px; right: 20px; width: 300px; max-height: 85vh; overflow-y: auto;',
		'  background: white; border: 4px double black; padding: 12px; z-index: 200;',
		'  font: 12px "Courier New", Courier, monospace; color: black; }',
		'#modMenu .modTitle { font-weight: bold; margin-bottom: 8px; letter-spacing: 1px; }',
		'#modMenu .modGroup { margin: 10px 0 4px; border-bottom: 1px solid black; }',
		'#modMenu .modRow { display: flex; justify-content: space-between; align-items: center; margin: 3px 0; }',
		'#modMenu .modRow.changed span { font-weight: bold; }',
		'#modMenu input { width: 70px; font: inherit; border: 1px solid black; padding: 1px 3px; }',
		'#modMenu .modActions { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px; }',
		'#modMenu .modBtn { border: 1px solid black; padding: 2px 6px; cursor: pointer; }',
		'#modMenu .modBtn:hover { background: black; color: white; }',
		'#modMenu .modMsg { margin-top: 8px; min-height: 14px; }'
	].join('\n')
};

ModMenu.init();

$(function() {
	$('<style>').text(ModMenu.STYLE).appendTo('head');
	$('<span>')
		.addClass('menuBtn')
		.text('mod menu.')
		.click(ModMenu.toggle)
		.appendTo('.menu');
});
