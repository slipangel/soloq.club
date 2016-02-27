Soloq.Router.map(function() {
  this.resource('soloq', { path: '/' });
});

Soloq.SoloqRoute = Ember.Route.extend({
	model: function() {
		return this.store.find('soloq');
	}
})