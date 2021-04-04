// TODO: kommentar!  And many of them!

function SecretSharing(codec) {
    this.codec = codec;
};

// Return a this-long random byte string
SecretSharing.prototype.randomString = function(length) {
    var a = new Array(length);
    for (i = 0; i < length; i++) {
        a[i] = String.fromCharCode(Math.floor(Math.random() * 256));
    }
    return a.join('');
};


SecretSharing.prototype.encode = function(inText) {
    var len = inText.length;
    var share1 = this.randomString(len);
    var share2 = new Array(len);

    // XOR share1 and share2:
    for (var i = 0; i < len; i++) {
        share2[i] = String.fromCharCode(share1.charCodeAt(i) ^ inText.charCodeAt(i));
    }

    return [this.codec.encode(new String(share1)), this.codec.encode(new String(share2.join("")))];
}

SecretSharing.prototype.decode = function(shares) {
    var share1 = this.codec.decode(shares[0]);
    var share2 = this.codec.decode(shares[1]);
    len = share1.length; // TODO: different lengths
    var target = new Array(len);

    // XOR share1 and share2:
    for (i = 0; i < len; i++) {
        target[i] = String.fromCharCode(share1.charCodeAt(i) ^ share2.charCodeAt(i));
    }

    return (target.join(''));
}
