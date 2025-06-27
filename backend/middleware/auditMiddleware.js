const AuditLog = require('../models/AuditLog');

// Create audit log entry
const createAuditLog = async (req, action, resource, resourceId, details = {}) => {
  try {
    const auditEntry = new AuditLog({
      user: req.user.id,
      action,
      resource,
      resourceId,
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      sessionId: req.session?.id,
      base: req.user.base,
      severity: getSeverityLevel(action),
      notes: details.notes || ''
    });

    await auditEntry.save();
  } catch (error) {
    console.error('Audit Log Error:', error);
    // Don't fail the request if audit logging fails
  }
};

// Get severity level based on action
const getSeverityLevel = (action) => {
  const criticalActions = ['delete', 'user_created', 'user_updated', 'asset_expended'];
  const highActions = ['create', 'update', 'purchase_approved', 'transfer_approved', 'asset_assigned'];
  const mediumActions = ['read', 'login', 'logout', 'purchase_created', 'transfer_requested'];
  
  if (criticalActions.includes(action)) return 'critical';
  if (highActions.includes(action)) return 'high';
  if (mediumActions.includes(action)) return 'medium';
  return 'low';
};

// Middleware to log all requests
const logRequest = (action, resource) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log after response is sent
      setTimeout(async () => {
        try {
          let resourceId = null;
          let details = {};

          // Extract resource ID from response or request
          if (data) {
            const responseData = JSON.parse(data);
            resourceId = responseData._id || responseData.id || req.params.id;
            details = {
              method: req.method,
              url: req.originalUrl,
              statusCode: res.statusCode,
              responseData: responseData
            };
          }

          await createAuditLog(req, action, resource, resourceId, details);
        } catch (error) {
          console.error('Request Logging Error:', error);
        }
      }, 0);

      originalSend.call(this, data);
    };

    next();
  };
};

// Middleware to log specific actions
const logAction = (action, resource, getResourceId = null, getDetails = null) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      setTimeout(async () => {
        try {
          let resourceId = null;
          let details = {};

          if (getResourceId) {
            resourceId = getResourceId(req, data);
          } else {
            resourceId = req.params.id || req.body.id;
          }

          if (getDetails) {
            details = getDetails(req, data);
          } else {
            details = {
              method: req.method,
              url: req.originalUrl,
              statusCode: res.statusCode,
              body: req.body,
              params: req.params
            };
          }

          await createAuditLog(req, action, resource, resourceId, details);
        } catch (error) {
          console.error('Action Logging Error:', error);
        }
      }, 0);

      originalSend.call(this, data);
    };

    next();
  };
};

// Middleware to log login attempts
const logLoginAttempt = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    setTimeout(async () => {
      try {
        const responseData = JSON.parse(data);
        const action = responseData.token ? 'login' : 'login_failed';
        const details = {
          email: req.body.email,
          statusCode: res.statusCode,
          success: !!responseData.token
        };

        await createAuditLog(req, action, 'user', null, details);
      } catch (error) {
        console.error('Login Logging Error:', error);
      }
    }, 0);

    originalSend.call(this, data);
  };

  next();
};

// Middleware to log data access
const logDataAccess = (resource) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      setTimeout(async () => {
        try {
          const details = {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            filters: req.query,
            baseId: req.query.baseId || req.params.baseId
          };

          await createAuditLog(req, 'read', resource, null, details);
        } catch (error) {
          console.error('Data Access Logging Error:', error);
        }
      }, 0);

      originalSend.call(this, data);
    };

    next();
  };
};

// Utility function to log custom events
const logCustomEvent = async (req, action, resource, resourceId, details) => {
  await createAuditLog(req, action, resource, resourceId, details);
};

module.exports = {
  logRequest,
  logAction,
  logLoginAttempt,
  logDataAccess,
  logCustomEvent,
  createAuditLog
}; 