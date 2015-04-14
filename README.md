## ES Object

ES Object is a library allowing to manipulate Elasticsearch objects and to more easily implement permissions on them.

### Installing

You can install this package as usual using NPM:

```bash
npm install --save esobject
```

### Creating your first object

Creating an object is done using the `esobject.create` method:

**`user.js`:**

```javascript
var esobject = require('esobject');

module.exports = esobject.create({
  // Database
  db: {
    // Here goes your database configuration
    host: 'localhost:9200',
    // ...

    // Plus the specific index & type reference
    index: 'myAppIndex',
    type: 'myTypeName'
  }

  // You can have an import strategy here (see later):
  import: {},

  // And also an export strategy:
  export: {}
});
```

You can have more information on available configuration properties on [http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/configuration.html](http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/configuration.html)

You can also provide an already configured client instead in esobject:

```javascript
var esobject = require('esobject');
var es = require('elasticsearch');

module.exports = esobject.create({
  // Database
  db: {
    // Use custom client
    client: new es.Client(/* params */),

    // Plus the specific index & type reference
    index: 'myAppIndex',
    type: 'myTypeName'
  }

  // You can have an import strategy here (see later):
  import: {},

  // And also an export strategy:
  export: {}
});
```

### Object API

Now that we have a basic object type, we can interact with it!

#### new instance

Here is how to create a brand new user programatically:

```javascript
var User = require('./user');

// Create a new user object, userId & userVersion are optional
var userObj = new User(userId, userVersion);

// You can now freely manipulate this instance
userObj.username = '<some user name>';
// ...
```

#### Get an instance

You can use this to retrieve an existing user from the database:

```javascript
var User = require('./user');

// This return a bluebird promise on the retrieved user instance
var myUser = User.get(userId);
```

#### Search instances

You can easily use the extended search API provided by elasticsearch:

```javascript
var User = require('./user');

// A promise on an object containing:
//  - total: the total number of elements found
//    (this can be more than the number of returned elements)
//  - elements: an array of user instances (max query.count elements)
//  - aggregations: the aggregations returned by ES with this search
var foundUsers = User.search({
  // A valid query in Elasticsearch like:
  filter: {
    term: {
      login: '<some user login>'
    }
  }
});
```

#### Save an instance

```javascript
var myUserInstance = /* ... */;

// This return a promise on the saved user
myUserInstance.save();
```

#### Delete an instance

```javascript
var myUserInstance = /* ... */;

// This return a promise on the deleted user
// (the promise should resolve to {ok: true})
myUserInstance.delete();
```

#### Import raw data in the object

```javascript
var myUserInstance = /* ... */;

// This will use the import strategy described during esobject.create()
// to import the provided raw data
// It returns a promise on the user instance with the provided data imported
myUserInstance.import({
  // some raw data
});
```

#### Export raw data

```javascript
var myUserInstance = /* ... */;

// This will use the export strategy described during esobject.create()
// to export the object's data
// It returns a promise on the exported raw data
myUserInstance.export();
```

### Import strategy

The import strategy allows to tune how data should be imported in the user object. It allows to fine tune how and what can be imported to the final object.

By default, `import()` imports nothing until you have provided a proper strategy for it. It will then import only the explicitely mentioned elements.

In a strategy, each element will be executed in an undefined order (right now, using V8, it will be the definition order but this is only because the order in which keys appear when browsing an object are their definition order). When there are exception to this rule, they will be stated explicitely.

#### Ignore value

This definition allow to explicitely ignore a value:

```javascript
var User = esobject.create({
  // ...

  import: {
    // This will ignore raw.ignored if set
    ignored: undefined
  },

  // ...
});
```

#### Set value

This definition allow to set a static value to the object at each import:

```javascript
var User = esobject.create({
  // ...

  import: {
    // This will force user.type to be eql to "user" after each import
    type: 'user'
  },

  // ...
});
```

#### Template

This definition will allow you to use other fieds to complete a more complex one:

```javascript
var User = esobject.create({
  // ...

  import: {
    // This will set displayname to "user.firstname + ' ' + user.lastname"
    // This uses lodash templates
    displayName: '<%= raw.firstname || obj.firstname %> <%= raw.lastname || obj.lastname %>'
  },

  // ...
});
```

In templates, during import, the following two objects are available:
* obj: values in the instance before import
* raw: raw values provided in the import

#### Function

This is the most complex way of describing an import value. They can return either a value or a promise on a value.

```javascript
var Promise = require('bluebird');

// Let's say House is another ESObject
var House = require('./houses');

var User = esobject.create({
  // ...

  import: {
    nbHouses: function(oldVal, newVal, obj, raw) {
      // oldVal contains the old value of nbHouses
      // rawVal contains the raw value of nbHouses
      // obj contains the old values (before import)
      // raw contains the raw values

      // This will return the number of houses owned by the user
      // This is only an exemple, this is probably bad design to do that
      // Here, the import strategy: "nbHouses: '<%= obj.nbHouses %>'" would
      // make a lot more sense (no reason this would have changed when
      // importing data)
      return House.search({
        count: 0,
        filter: {
          term: {
            user_id: obj._id
          }
        }
      })
        .get('total')
      ;
    }
  },

  // ...
});
```

#### `$check`

The `$check` import is a specific element of a strategy. It will **always** be executed last.

It is meant to write validation on your object.

```javascript
var User = esobject.create({
  // ...

  import: {
    $check: function(oldObj, resObj) {
      // oldObj contains the old values (before import)
      // resObj contains the user instance after all imports have been run

      if (!oldObj.admin && resObj.admin)
        throw new Error('admin is demote only');

      if (oldObj.login !== resObj.login)
        throw new Error('login is read-only');

      // ...
      // You can check types / values using context or not
    }
  },

  // ...
});
```

#### Additional parameters

You can pass additional parameters to the `import()` function. Those will be passed through as additional parameters to all functions in the strategy. This can be very usefull, especially in the `$check` function.

### Export strategy

The export strategy works almost the same way than the import strategy.

Here are the main differences:
* it exports everything by default (except internal fields like `_id` & `_version`), the `ignore value` strategy becoming very useful to prevent exporting some data
* in export templates, there is no `obj` & `raw` values, the context is the current object's instance, so you can access its property directly (eg: `displayName: '<%= firstname %> <%= lastname %>`)
* in export functions, the `newVal` & `raw` arguments are `null`
* in `$check`, there is only one argument that is the exported object (even if `$check` does not seem very usefull here, it can be used to do some cleanup & modifications before final value is returned)

### Complete example

```javascript

// if useOld is truthy, then copies old data
// if the new data is provided
// in old case, if a value can not be found, deletes
// the attribute in the old object
function id(useOld) {
  return function(oldVal, newVal) {
    if (useOld)
      return newVal || oldVal;
    return newVal;
  };
}

var User = esobject.create({
  db: {
    host: 'localhost:9200',

    index: 'myAppIndex',
    type: 'users'
  },

  import: {
    $check: function(oldObj, resObj, loggedUser) {
      // Admin can do whatever they want, do not check anything!
      if (loggedUser.admin)
        return;

      if (oldObj.login !== resObj.login)
        throw new Error('login is read-only');

      // ...
    },

    // Import login & email & firstname & lastname
    login: id(true),
    email: id(true),
    firstname: id(true),
    lastname: id(true),

    password: function(oldVal, newVal) {
      if (!newVal || isHash(newVal))
        return newVal || oldVal;

      return hashPassword(newVal);
    },

    sso: {
      type: id(),
      data: function(oldVal, newVal) {
        if (!_.isObject(data))
          return new Error('sso data should be an object');

        return data;
      }
    },

    // exemple method
    // if newVal exists, it should be an url
    // exemple of how check & fetch & resize & convert
    // could be written to save an url data in the object
    avatar: function(oldVal, newVal) {
      if (!newVal)
        return oldVal;

      return completeAndCheckImageUrl(newVal)
        .then(fetchAndResize)
        .then(convertToUrlData)
      ;
    },

    // Handle createdAt & updatedAt dates
    createdAt: function(oldVal) {
      return oldVal || Date.now;
    },
    updatedAt: Date.now
  },

  export: {
    // Expose internal id & version
    id: '<%= _id %>';
    version: '<%= _version %>',

    // Prevent password & email & sso.data from being exposed
    password: undefined,
    email: undefined,
    sso: {
      data: undefined
    }

    // Export fake displayName for convenience
    displayName: '<%= firstname %> <%= lastname %>',

    // Export date
    exportedAt: Date.now
  }
});
```
