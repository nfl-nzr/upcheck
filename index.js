const stream = require('stream');
const fs = require('fs');
const split = require('split2');
const request = require('request');
const urlFile = process.argv[2];
// Test

class ParallelStream extends stream.Transform {
    constructor(userTransform) {
        super();
        this.userTransform = userTransform;
        this.running = 0;
        this.terminateCallback = null;
    }

    _transform(chunk, enc, done) {
        this.running++;
        this.userTransform(chunk, enc, this._onComplete.bind(this));
        done();
    }

    _flush(done) {
        if (this.running > 0) {
            this.terminateCallback = done;
        } else {
            done()
        }
    }

    _onComplete(err) {
        this.running--;
        if (err) this.emit(err);
        if (this.running === 0) this.terminateCallback && this.terminateCallback();
    }
}

fs.createReadStream(urlFile, 'utf-8')
    .pipe(split())
    .pipe(new ParallelStream(function (url, enc, done) {
        if (!url) return done();
        const self = this;
        request.head(url.toString(), function (err) {
            self.push(url + ' is ' + (err ? 'down' : 'up') + '\n');
            done();
        });
    }))
    .pipe(fs.createWriteStream('results.txt'))
    .on('finish', () => console.log('Done. Results available in results.txt'));

module.exports = ParallelStream;
