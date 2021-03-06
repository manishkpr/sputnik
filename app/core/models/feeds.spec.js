import feedsModel from './feeds';

var jetpack = require('fs-jetpack');
var os = require('os');

describe('feeds model', function () {

    var tmpdir = os.tmpdir() + '/sputnik_unit_tests';
    var feeds;

    beforeEach(module('sputnik', function($provide) {
        $provide.service('feeds', feedsModel);
    }));

    beforeEach(inject(function (_feeds_) {
        feeds = _feeds_;
    }));

    afterEach(function() {
        jetpack.dir(tmpdir, { exists: false });
    });

    var reload = function () {
        return feeds.init(tmpdir);
    };

    it('when totally empty still has special category representing uncategorized feeds', function (done) {
        reload()
        .then(function () {
            var uncat = feeds.uncategorized;
            expect(uncat.id).toBe('uncategorized');
            expect(uncat.name).toBeUndefined();
            expect(uncat.feeds).toEqual([]);
            expect(feeds.categories[0]).toBe(uncat);
            done();
        });
    });

    it('can add, update, remove category', function (done) {
        reload()
        .then(function () {
            return feeds.addCategory({
                name: 'Cat 1'
            });
        })
        .then(reload)
        .then(function () {
            expect(feeds.categories.length).toBe(2);
            var cat = feeds.categories[0]; // Uncategorized should be always last,
                                           // so this one should be on zero index.
            expect(cat.id).toBeDefined();
            expect(cat.name).toBe('Cat 1');
            expect(cat.feeds).toEqual([]);
            return cat.update({
                name: 'Cool Cat 1'
            });
        })
        .then(reload)
        .then(function () {
            var cat = feeds.categories[0];
            expect(cat.name).toBe('Cool Cat 1');
            return cat.remove();
        })
        .then(reload)
        .then(function () {
            expect(feeds.categories.length).toBe(1);
            expect(feeds.categories[0].id).toBe('uncategorized');
            done();
        });
    });

    it('can add, update, remove feed', function (done) {
        reload()
        .then(function () {
            return feeds.uncategorized.addFeed({
                url: 'http://example.com'
            });
        })
        .then(reload)
        .then(function () {
            var feed = feeds.all[0];
            expect(feed.url).toBe('http://example.com');
            expect(feeds.uncategorized.feeds.length).toBe(1);
            expect(feeds.uncategorized.feeds[0]).toBe(feed);
            return feed.update({
                originalName: 'Feed 1'
            });
        })
        .then(reload)
        .then(function () {
            var feed = feeds.all[0];
            expect(feed.url).toBe('http://example.com');
            expect(feed.name).toBe('Feed 1');
            return feed.remove();
        })
        .then(reload)
        .then(function () {
            expect(feeds.all.length).toBe(0);
            expect(feeds.uncategorized.feeds.length).toBe(0);
            done();
        });
    });

    it('can add feed to new category', function (done) {
        feeds.init()
        .then(function () {
            return feeds.addCategory({
                name: 'Cat 1'
            });
        })
        .then(function () {
            var cat = feeds.categories[0];
            cat.addFeed({
                url: 'http://example.com'
            })
            .then(function () {
                expect(feeds.all[0].url).toBe('http://example.com');
                expect(cat.feeds[0].url).toBe('http://example.com');
                done();
            });
        });
    });

    it('will throw if you want to add feed without specifying URL', function (done) {
        feeds.init()
        .then(function () {
            return feeds.uncategorized.addFeed({
                name: 'Feed'
            });
        })
        .catch(function (err) {
            expect(err).toBe("Feed's URL must be specified");
            done();
        });
    });

    it("can change feed's category", function (done) {
        reload()
        .then(function () {
            return feeds.addCategory({
                name: 'Cat 1'
            });
        })
        .then(function () {
            return feeds.addCategory({
                name: 'Cat 2'
            });
        })
        .then(function () {
            return feeds.categories[0].addFeed({
                url: 'http://example.com'
            })
        })
        .then(reload)
        .then(function () {
            var cat1 = feeds.categories[0];
            var feed = cat1.feeds[0];
            var cat2 = feeds.categories[1];
            expect(feed.category).toBe(cat1);
            expect(cat1.feeds.length).toBe(1);
            expect(cat1.feeds[0]).toBe(feed);
            expect(cat2.feeds.length).toBe(0);
            return feed.setCategory(cat2);
        })
        .then(reload)
        .then(function () {
            var cat1 = feeds.categories[0];
            var cat2 = feeds.categories[1];
            var feed = cat2.feeds[0];
            expect(feed.category).toBe(cat2);
            expect(cat1.feeds.length).toBe(0);
            expect(cat2.feeds.length).toBe(1);
            expect(cat2.feeds[0]).toBe(feed);
            done();
        });
    });

    it("can change feed's category to uncategorized", function (done) {
        reload()
        .then(function () {
            return feeds.addCategory({
                name: 'Cat 1'
            });
        })
        .then(function () {
            return feeds.categories[0].addFeed({
                url: 'http://example.com'
            });
        })
        .then(reload)
        .then(function () {
            var feed = feeds.categories[0].feeds[0];
            return feed.setCategory(feeds.uncategorized);
        })
        .then(reload)
        .then(function () {
            expect(feeds.categories[0].feeds.length).toBe(0);
            expect(feeds.uncategorized.feeds.length).toBe(1);
            expect(feeds.uncategorized.feeds[0].url).toBe('http://example.com');
            done();
        });
    });

    it("can delete category with all feeds inside", function (done) {
        reload()
        .then(function () {
            return feeds.addCategory({
                name: 'Cat'
            });
        })
        .then(function () {
            return feeds.categories[0].addFeed({
                url: 'http://example.com'
            });
        })
        .then(reload)
        .then(function () {
            var cat = feeds.categories[0];
            var feed = feeds.all[0];
            expect(feed.category).toBe(cat);
            return cat.remove();
        })
        .then(reload)
        .then(function () {
            expect(feeds.all.length).toBe(0);
            expect(feeds.categories.length).toBe(1);
            done();
        });
    });

    it('sorts alphabetically categories and feeds', function (done) {
        feeds.init()
        .then(function () {
            return feeds.uncategorized.addFeed({
                url: 'http://2.com',
                originalName: 'F2',
            });
        })
        .then(function () {
            return feeds.uncategorized.addFeed({
                url: 'http://1.com',
                originalName: 'F1',
            });
        })
        .then(function () {
            return feeds.addCategory({
                name: 'C2'
            });
        })
        .then(function () {
            return feeds.addCategory({
                name: 'C1'
            });
        })
        .then(function () {
            expect(feeds.uncategorized.feeds[0].name).toBe('F1');
            expect(feeds.uncategorized.feeds[1].name).toBe('F2');
            expect(feeds.categories[0].name).toBe('C1');
            expect(feeds.categories[1].name).toBe('C2');
            done();
        });
    });

});
